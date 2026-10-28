// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One warm model per open document. A param edit reuses the loaded solids
// (`updateModelParams`). A source change, a kernel error, or eviction drops
// the entry and frees its OCCT handles. The least-recently-used document is
// evicted past `maxDocuments` or the retained-byte budget.

import { isOcctWasmPoisoned } from '../../kernel/backends/occt/occtException';
import { KernelError } from '../../shared/intent/kernelError';
import type { BuildModelInput, BuiltModel, ParamUpdateEdit } from '../buildModel';
import { updateModelParams } from '../paramUpdate';
import { importIdentity } from './importIdentity';
import { disposeModelShapes, retainedShapeBytes } from './releaseShapes';

export { disposeModelShapes } from './releaseShapes';

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
  /**
   * Approximate native bytes of the solids kept across every open document.
   * The least recently used document is evicted past this. One document is
   * always kept, even when it alone is over the budget. Default 256 MiB.
   */
  maxRetainedBytes?: number;
  build(input: BuildModelInput): Promise<BuiltModel>;
}

interface Entry {
  id: string;
  sourceHash: string;
  code: string;
  fileName: string;
  scriptDir?: string;
  /** Bytes of `lib.fromSTEP` / font files the source names. */
  importHash: string;
  model: BuiltModel;
  overrides: Record<string, ParamUpdateEdit['value']>;
  /** Approximate native bytes of `model`, charged against `maxRetainedBytes`. */
  bytes: number;
}

function sameIdentity(existing: Entry, input: WarmOpen, hash: string, imports: string): boolean {
  return existing.sourceHash === hash
    && existing.fileName === input.fileName
    && existing.scriptDir === input.scriptDir
    && existing.importHash === imports;
}

function featureFailed(diagnostics: readonly { severity: string }[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
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

function view(entry: Entry): WarmDocument {
  return { id: entry.id, sourceHash: entry.sourceHash, model: entry.model };
}

const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;

class WarmDocuments implements WarmDocumentStore {
  private readonly docs = new Map<string, Entry>();
  private readonly maxDocuments: number;
  private readonly maxRetainedBytes: number;
  private readonly build: WarmDocumentStoreOptions['build'];

  constructor(options: WarmDocumentStoreOptions) {
    this.maxDocuments = options.maxDocuments ?? DEFAULT_MAX;
    if (this.maxDocuments < 1) throw new Error('warm document store requires maxDocuments >= 1');
    this.maxRetainedBytes = options.maxRetainedBytes ?? DEFAULT_MAX_BYTES;
    if (this.maxRetainedBytes < 1) throw new Error('warm document store requires maxRetainedBytes >= 1');
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

  private totalBytes(): number {
    let total = 0;
    for (const entry of this.docs.values()) total += entry.bytes;
    return total;
  }

  private evictOverflow(): void {
    while (
      this.docs.size > this.maxDocuments
      // A lone document stays even when it alone is over the byte budget.
      // Evicting it would drop the only model the session can edit.
      || (this.docs.size > 1 && this.totalBytes() > this.maxRetainedBytes)
    ) {
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
    const imports = importIdentity(input.code, input.scriptDir);
    const existing = this.docs.get(input.id);
    if (existing && sameIdentity(existing, input, hash, imports)) {
      this.touch(existing);
      return view(existing);
    }
    if (existing) this.evict(input.id);
    const model = await this.build({ code: input.code, fileName: input.fileName, scriptDir: input.scriptDir });
    return this.insert({
      id: input.id,
      sourceHash: hash,
      importHash: imports,
      code: input.code,
      fileName: input.fileName,
      scriptDir: input.scriptDir,
      model,
      overrides: {},
      bytes: retainedShapeBytes(model),
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
    // A lower that kept the unfinished base (unresolved fillet, chamfer, shell,
    // draft) must not become the next baseline. Rebuild from source instead.
    if (featureFailed(updated.model.diagnostics)) {
      throw new KernelError(
        'recompute.lowering.exception',
        'params.update: feature failed; warm baseline refused',
      );
    }
    // `updateModelParams` already freed solids the new baseline does not keep.
    entry.model = updated.model;
    entry.bytes = retainedShapeBytes(updated.model);
    this.evictOverflow();
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
    const stored: Entry = {
      ...entry,
      model,
      overrides,
      bytes: retainedShapeBytes(model),
      importHash: importIdentity(entry.code, entry.scriptDir),
    };
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
