// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/rebuildCache.ts
//
// Bounded, content-keyed LRU of finished rebuilds in the browser kernel
// worker. Dragging a slider back over values it already visited, undo/redo
// and "reset to defaults" answer from here without touching the kernel.
//
// Design adapted from OpenZCAD's ExactRebuildCache
// (https://github.com/esaueng/OpenZCAD, apps/web/src/worker/exactRebuildCache.ts,
// Apache-2.0): a result is keyed by the canonical content the rebuild reads,
// never by bookkeeping such as a version counter, so returning to an earlier
// state is a hit; entries and retained bytes are both bounded and the least
// recently used entry is evicted first. Values are derived data: an evicted
// entry is simply rebuilt.

import { hashText } from './meshFingerprint';

export interface RebuildCacheOptions {
  maxEntries: number;
  maxBytes: number;
}

interface Entry<T> {
  value: T;
  bytes: number;
}

/** Defaults from the plan: about 8 rebuilds or 32 MiB, whichever comes first. */
export const DEFAULT_REBUILD_CACHE: RebuildCacheOptions = { maxEntries: 8, maxBytes: 32 * 1024 * 1024 };

/** Canonical JSON: sorted keys, so `{a,b}` and `{b,a}` are one key. */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

/** Key of one rebuild: everything its result depends on, and nothing else. */
export function rebuildCacheKey(input: {
  source: string;
  params: Record<string, number | boolean>;
  quality: string;
  kernelVersion: string;
}): string {
  // The source is hashed separately so a multi-kilobyte model does not make
  // every key a multi-kilobyte string; the length guards the 64-bit hash.
  return `${input.kernelVersion}|${input.quality}|${input.source.length}:${hashText(input.source)}|${stableJson(input.params)}`;
}

export class RebuildCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private retained = 0;
  private readonly options: RebuildCacheOptions;
  private readonly sizeOf: (value: T) => number;

  constructor(options: RebuildCacheOptions, sizeOf: (value: T) => number) {
    this.options = options;
    this.sizeOf = sizeOf;
    if (options.maxEntries < 1 || options.maxBytes < 1) {
      throw new Error('Rebuild cache limits must be positive.');
    }
  }

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    return this.retained;
  }

  /** The cached value, now most recently used; undefined on a miss. */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /** Store a value. One larger than the whole budget is not kept. */
  set(key: string, value: T): void {
    const bytes = this.sizeOf(value);
    this.delete(key);
    if (!Number.isFinite(bytes) || bytes > this.options.maxBytes) return;
    this.entries.set(key, { value, bytes });
    this.retained += bytes;
    this.evict();
  }

  delete(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.retained -= entry.bytes;
  }

  clear(): void {
    this.entries.clear();
    this.retained = 0;
  }

  private evict(): void {
    while (this.entries.size > this.options.maxEntries || this.retained > this.options.maxBytes) {
      const oldest = this.entries.keys().next();
      if (oldest.done) return;
      this.delete(oldest.value);
    }
  }
}
