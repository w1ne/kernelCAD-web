// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// In-process Parasolid reader. The wasm is built from crates/parasolid-import,
// which links parasolid-core. Nothing is spawned and nothing is looked up on PATH.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Exact geometry for one loop segment (a half-edge of one edge). */
export interface ParasolidSegment {
  curve: {
    kind: string;
    point?: number[];
    direction?: number[];
    center?: number[];
    normal?: number[];
    xAxis?: number[];
    radius?: number;
    major?: number;
    minor?: number;
  } | null;
  /** Traversal start/end of this fin; null when the edge is a full ring. */
  start?: number[] | null;
  end?: number[] | null;
  sense?: '+' | '-' | '?';
}

export interface ParasolidFace {
  kind: string;
  loops: number[][][];
  /** Exact per-loop segments, aligned with loops; empty when not exact. */
  edges?: (ParasolidSegment | null)[][];
  surf?: {
    point?: number[];
    center?: number[];
    normal?: number[];
    axis?: number[];
    xAxis?: number[];
    radius?: number;
    major?: number;
    minor?: number;
    sinHalf?: number;
    cosHalf?: number;
  } | null;
}

/** One B-rep body with its faces, in file coordinates. */
export interface ParasolidBody {
  faces: ParasolidFace[];
}

/**
 * One placed occurrence of a body: `x' = (rotation * x + translation) * scale`,
 * with the rotation as a row-major 3x3 matrix. Coordinates are the file's own
 * unit; the caller scales them to millimetres.
 */
export interface ParasolidInstance {
  body: number;
  rotation: number[];
  translation: number[];
  scale: number;
}

export interface ParasolidRead {
  ok: boolean;
  code?: string;
  schemaKey?: string | null;
  message?: string;
  complete?: boolean;
  bodyCount?: number;
  unplacedBodies?: number;
  bodies?: ParasolidBody[];
  instances?: ParasolidInstance[];
}

/** Minimal WebAssembly surface used here; kept independent of DOM lib settings. */
interface WasmMemoryLike {
  readonly buffer: ArrayBuffer;
}

interface WasmInstanceResult {
  instance: { exports: unknown };
}

interface WasmApi {
  instantiate: (bytes: Uint8Array) => Promise<WasmInstanceResult>;
}

interface ParasolidExports {
  memory: WasmMemoryLike;
  alloc: (byteLength: number) => number;
  dealloc: (ptr: number, byteLength: number) => void;
  read_parasolid: (ptr: number, byteLength: number) => number;
  result_ptr: () => number;
  panic_ptr?: () => number;
  panic_len?: () => number;
}

let modulePromise: Promise<ParasolidExports> | undefined;

function load(): Promise<ParasolidExports> {
  modulePromise ??= (async () => {
    const wasm = (globalThis as { WebAssembly?: WasmApi }).WebAssembly;
    if (!wasm || typeof wasm.instantiate !== 'function') {
      throw new Error('parasolid import: WebAssembly is not available in this environment');
    }
    const wasmPath = join(dirname(fileURLToPath(import.meta.url)), 'parasolid_import.wasm');
    const bytes = await readFile(wasmPath);
    const { instance } = await wasm.instantiate(bytes);
    return instance.exports as ParasolidExports;
  })();
  return modulePromise;
}

/** Parse one Parasolid transmit buffer inside this process. */
export async function readParasolidBytes(input: Uint8Array): Promise<ParasolidRead> {
  const wasm = await load();
  if (process.env.KERNELCAD_PARASOLID_DEBUG) {
    console.error('[parasolid] input', input.byteLength, 'wasm memory before alloc', wasm.memory.buffer.byteLength);
  }
  const ptr = wasm.alloc(input.byteLength);
  new Uint8Array(wasm.memory.buffer, ptr, input.byteLength).set(input);
  if (process.env.KERNELCAD_PARASOLID_DEBUG) {
    console.error('[parasolid] wasm memory after input copy', wasm.memory.buffer.byteLength);
  }
  let byteLength: number;
  try {
    // The call takes ownership of the input allocation: the module compacts
    // the buffer in place and releases it before returning.
    byteLength = wasm.read_parasolid(ptr, input.byteLength);
  } catch (error) {
    // The module aborts on panic; the hook left the reason in its own buffer.
    const message = readPanicMessage(wasm);
    if (process.env.KERNELCAD_PARASOLID_DEBUG) {
      console.error('[parasolid] wasm memory at abort', wasm.memory.buffer.byteLength);
    }
    throw new Error(
      `parasolid import: the reader aborted${message ? `: ${message}` : ' (out of memory or an internal abort)'}`,
      { cause: error },
    );
  }
  // The result lives in the wasm module until the next call. Copy it now.
  const json = new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, wasm.result_ptr(), byteLength));
  return JSON.parse(json) as ParasolidRead;
}

function readPanicMessage(wasm: ParasolidExports): string {
  try {
    if (!wasm.panic_ptr || !wasm.panic_len) return '';
    const length = wasm.panic_len();
    if (!length || length > 1_000_000) return '';
    return new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, wasm.panic_ptr(), length));
  } catch {
    return '';
  }
}
