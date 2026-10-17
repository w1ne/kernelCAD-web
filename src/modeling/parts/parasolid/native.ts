// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// In-process Parasolid reader. The wasm is built from crates/parasolid-import,
// which links parasolid-core. Nothing is spawned and nothing is looked up on PATH.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ParasolidFace {
  kind: string;
  loops: number[][][];
}

export interface ParasolidRead {
  ok: boolean;
  code?: string;
  schemaKey?: string | null;
  message?: string;
  complete?: boolean;
  bodyCount?: number;
  faces?: ParasolidFace[];
}

interface ParasolidExports {
  memory: WebAssembly.Memory;
  alloc: (byteLength: number) => number;
  dealloc: (ptr: number, byteLength: number) => void;
  read_parasolid: (ptr: number, byteLength: number) => number;
  result_ptr: () => number;
}

let modulePromise: Promise<ParasolidExports> | undefined;

function load(): Promise<ParasolidExports> {
  modulePromise ??= (async () => {
    const wasmPath = join(dirname(fileURLToPath(import.meta.url)), 'parasolid_import.wasm');
    const bytes = await readFile(wasmPath);
    const { instance } = await WebAssembly.instantiate(bytes);
    return instance.exports as unknown as ParasolidExports;
  })();
  return modulePromise;
}

/** Parse one Parasolid transmit buffer inside this process. */
export async function readParasolidBytes(input: Uint8Array): Promise<ParasolidRead> {
  const wasm = await load();
  const ptr = wasm.alloc(input.byteLength);
  new Uint8Array(wasm.memory.buffer, ptr, input.byteLength).set(input);
  const byteLength = wasm.read_parasolid(ptr, input.byteLength);
  // The result lives in the wasm module until the next call. Copy it now.
  const json = new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, wasm.result_ptr(), byteLength));
  wasm.dealloc(ptr, input.byteLength);
  return JSON.parse(json) as ParasolidRead;
}
