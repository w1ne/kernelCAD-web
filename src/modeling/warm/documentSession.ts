// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One warm model per open document. A param edit reuses the loaded solids
// (`updateModelParams`). A source change, a kernel error, or eviction drops
// the entry and frees its OCCT handles. The least-recently-used document is
// evicted past `maxDocuments`.

import { isOcctWasmPoisoned } from '../../kernel/backends/occt/occtException';
import { KernelError } from '../../shared/intent/kernelError';
import type { ShapeBackend } from '../../kernel/backends/backend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { BuildModelInput, BuiltModel, ParamUpdateEdit } from '../buildModel';
import { updateModelParams } from '../paramUpdate';

export interface WarmDocument {
  readonly id: string;
  readonly sourceHash: string;
  readonly model: BuiltModel;
}

export interface WarmEditResult {
  readonly document: WarmDocument;
  readonly relowered: readonly string[];
  readonly skipped: readonly string[];
  readonly rigidReused: readonly string[];
  readonly path: 'incremental' | 'full';
}

export interface WarmDocumentStore {
  open(input: WarmOpen): Promise<WarmDocument>;
  edit(id: string, edits: readonly ParamUpdateEdit[]): Promise<WarmEditResult>;
  has(id: string): boolean;
  evict(id: string): void;
  /** Drop every document without freeing handles. The kernel reset already did. */
  abandon(): void;
}

export interface WarmOpen {
  id: string;
  code: string;
  fileName: string;
  scriptDir?: string;
}

export interface WarmDocumentStoreOptions {
  /** Live documents. The least recently used is evicted past this. Default 4. */
  maxDocuments?: number;
  build(input: BuildModelInput): Promise<BuiltModel>;
}

interface Entry {
  id: string;
  sourceHash: string;
  code: string;
  fileName: string;
  scriptDir?: string;
  model: BuiltModel;
  overrides: Record<string, ParamUpdateEdit['value']>;
}

const DEFAULT_MAX = 4;

export function sourceHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x01000193);
  }
  return `${text.length.toString(16)}:${(h1 >>> 0).toString(16)}:${(h2 >>> 0).toString(16)}`;
}

function disposeShape(shape: ShapeBackend, seen: Set<object>): void {
  if (seen.has(shape)) return;
  seen.add(shape);
  if (isSceneBackend(shape)) {
    for (const part of shape.parts) disposeShape(part.shape, seen);
    return;
  }
  try {
    shape.dispose?.();
  } catch {
    // A failed lower may already have freed this handle.
  }
}

export function disposeModelShapes(model: BuiltModel): void {
  const seen = new Set<object>();
  for (const shape of model.shapes.values()) disposeShape(shape, seen);
  for (const shape of model.session.cachedShapes.values()) disposeShape(shape, seen);
}

function disposeReplaced(previous: ReadonlyMap<string, ShapeBackend>, next: ReadonlyMap<string, ShapeBackend>): void {
  const kept = new Set<ShapeBackend>(next.values());
  const seen = new Set<object>();
  for (const shape of previous.values()) {
    if (kept.has(shape) || isSceneBackend(shape)) continue;
    disposeShape(shape, seen);
  }
}

function view(entry: Entry): WarmDocument {
  return { id: entry.id, sourceHash: entry.sourceHash, model: entry.model };
}

class WarmDocuments implements WarmDocumentStore {
  private readonly docs = new Map<string, Entry>();
  private readonly maxDocuments: number;
  private readonly build: WarmDocumentStoreOptions['build'];

  constructor(options: WarmDocumentStoreOptions) {
    this.maxDocuments = options.maxDocuments ?? DEFAULT_MAX;
    if (this.maxDocuments < 1) throw new Error('warm document store requires maxDocuments >= 1');
    this.build = options.build;
  }

  private touch(entry: Entry): void {
    this.docs.delete(entry.id);
    this.docs.set(entry.id, entry);
  }

  evict(id: string): void {
    const entry = this.docs.get(id);
    if (!entry) return;
    this.docs.delete(id);
    disposeModelShapes(entry.model);
  }

  private evictOverflow(): void {
    while (this.docs.size > this.maxDocuments) {
      const oldest = this.docs.keys().next().value;
      if (oldest === undefined) return;
      this.evict(oldest);
    }
  }

  private insert(entry: Entry): WarmDocument {
    const previous = this.docs.get(entry.id);
    if (previous && previous !== entry) this.evict(entry.id);
    this.docs.set(entry.id, entry);
    this.evictOverflow();
    return view(entry);
  }

  async open(input: WarmOpen): Promise<WarmDocument> {
    const hash = sourceHash(input.code);
    const existing = this.docs.get(input.id);
    if (existing && existing.sourceHash === hash && existing.fileName === input.fileName) {
      this.touch(existing);
      return view(existing);
    }
    if (existing) this.evict(input.id);
    const model = await this.build({ code: input.code, fileName: input.fileName, scriptDir: input.scriptDir });
    return this.insert({
      id: input.id,
      sourceHash: hash,
      code: input.code,
      fileName: input.fileName,
      scriptDir: input.scriptDir,
      model,
      overrides: {},
    });
  }

  async edit(id: string, edits: readonly ParamUpdateEdit[]): Promise<WarmEditResult> {
    const entry = this.docs.get(id);
    if (!entry) throw new Error(`warm document '${id}' is not open`);
    this.touch(entry);
    try {
      return await this.editIncremental(entry, edits);
    } catch (err) {
      return this.editFailed(entry, edits, err);
    }
  }

  has(id: string): boolean {
    return this.docs.has(id);
  }

  abandon(): void {
    this.docs.clear();
  }

  private async editIncremental(entry: Entry, edits: readonly ParamUpdateEdit[]): Promise<WarmEditResult> {
    const updated = await updateModelParams(entry.model, [...edits]);
    disposeReplaced(entry.model.shapes, updated.model.shapes);
    entry.model = updated.model;
    for (const edit of edits) entry.overrides[edit.name] = edit.value;
    return {
      document: view(entry),
      relowered: updated.result.relowered,
      skipped: updated.result.skipped,
      rigidReused: updated.result.rigidReused,
      path: 'incremental',
    };
  }

  private async editFailed(entry: Entry, edits: readonly ParamUpdateEdit[], err: unknown): Promise<WarmEditResult> {
    if (isOcctWasmPoisoned(err)) {
      this.docs.clear();
      throw err;
    }
    // A rejected edit never touched the solids. Keep the open document.
    if (err instanceof KernelError && err.message.startsWith('params.update: param')) throw err;
    return this.rebuild(entry, edits);
  }

  private async rebuild(entry: Entry, edits: readonly ParamUpdateEdit[]): Promise<WarmEditResult> {
    const overrides = { ...entry.overrides };
    for (const edit of edits) overrides[edit.name] = edit.value;
    this.evict(entry.id);
    let model = await this.build({ code: entry.code, fileName: entry.fileName, scriptDir: entry.scriptDir });
    const replay = Object.entries(overrides).map(([name, value]) => ({ name, value }));
    try {
      if (replay.length > 0) model = (await updateModelParams(model, replay)).model;
    } catch (err) {
      disposeModelShapes(model);
      throw err;
    }
    const stored: Entry = { ...entry, model, overrides };
    return { ...fullResult(stored), document: this.insert(stored) };
  }
}

function fullResult(entry: Entry): Omit<WarmEditResult, 'document'> {
  return {
    relowered: entry.model.records.map((record) => record.id),
    skipped: [],
    rigidReused: [],
    path: 'full',
  };
}

export function createWarmDocumentStore(options: WarmDocumentStoreOptions): WarmDocumentStore {
  return new WarmDocuments(options);
}
