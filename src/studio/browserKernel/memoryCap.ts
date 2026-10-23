// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/memoryCap.ts
//
// A hard ceiling on the browser kernel's WebAssembly memory.
//
// The OCCT build grows its heap on demand up to 2 GiB. A dedicated worker
// shares the tab's renderer process, so one runaway model could take the
// whole Studio down with it. Emscripten grows the heap by calling
// `WebAssembly.Memory.prototype.grow` from JavaScript; this wraps that method
// before the module is instantiated and refuses any growth past the cap. The
// allocation then fails inside the kernel, the job fails with a clear
// "memory" error, and the page throws the worker away (its heap is no longer
// trustworthy) and serves the edit from the server.
//
// The wrapper is installed non-writable and non-configurable, so model code
// cannot put the original back.
//
// What is and is not capped:
//   - capped: the OCCT heap's growth (the kernel's only large allocation);
//   - closed separately: model code creating its own wasm memory or module
//     (`new WebAssembly.Memory`, compile/instantiate are removed after OCCT
//     starts, see workerLockdown.ts `lockDownCodeGeneration`);
//   - NOT capped: plain JavaScript allocations by model code (arrays,
//     ArrayBuffers, typed arrays, strings). Those are bounded only by the
//     browser's limits for a worker. A runaway allocation ends the worker
//     (crash -> respawn -> the server builds the edit), but an engine that
//     handles worker OOM by killing the renderer would take the tab with it.

export interface MemoryCap {
  /** Bytes currently allocated by the largest memory seen growing. */
  bytes(): number;
  /** True once a growth was refused. */
  capHit(): boolean;
  readonly capBytes: number;
}

const PAGE_BYTES = 65536;

export function installWasmMemoryCap(
  capBytes: number,
  memoryCtor: { prototype: WebAssembly.Memory } = WebAssembly.Memory,
): MemoryCap {
  const proto = memoryCtor.prototype as WebAssembly.Memory & { grow(delta: number): number };
  const originalGrow = proto.grow;
  let hit = false;
  let largest = 0;
  const watched = new Set<WebAssembly.Memory>();

  function grow(this: WebAssembly.Memory, delta: number): number {
    const current = this.buffer.byteLength;
    if (current + Number(delta) * PAGE_BYTES > capBytes) {
      hit = true;
      throw new RangeError(
        `kernelCAD browser kernel: memory cap of ${Math.round(capBytes / 1048576)} MiB reached`,
      );
    }
    watched.add(this);
    const previous = originalGrow.call(this, delta);
    largest = Math.max(largest, this.buffer.byteLength);
    return previous;
  }

  Object.defineProperty(proto, 'grow', { value: grow, writable: false, enumerable: false, configurable: false });

  return {
    capBytes,
    bytes() {
      for (const memory of watched) largest = Math.max(largest, memory.buffer.byteLength);
      return largest;
    },
    capHit: () => hit,
  };
}
