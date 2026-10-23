// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { installWasmMemoryCap } from './memoryCap';

const PAGE = 65536;

/** Stand-in for WebAssembly.Memory: patching the real prototype would
 *  outlive this test file (the wrapper is non-configurable on purpose). */
function fakeMemoryCtor() {
  class FakeMemory {
    bytes: number;
    constructor(pages: number) { this.bytes = pages * PAGE; }
    get buffer(): { byteLength: number } { return { byteLength: this.bytes }; }
    grow(delta: number): number {
      const previous = this.bytes / PAGE;
      this.bytes += delta * PAGE;
      return previous;
    }
  }
  return FakeMemory;
}

describe('installWasmMemoryCap', () => {
  it('lets the heap grow up to the cap and refuses past it', () => {
    const Memory = fakeMemoryCtor();
    const cap = installWasmMemoryCap(10 * PAGE, Memory as unknown as { prototype: WebAssembly.Memory });
    const memory = new Memory(2);
    expect(memory.grow(8)).toBe(2);
    expect(cap.bytes()).toBe(10 * PAGE);
    expect(cap.capHit()).toBe(false);
    expect(() => memory.grow(1)).toThrow(/memory cap of \d+ MiB reached/);
    expect(cap.capHit()).toBe(true);
    expect(memory.bytes).toBe(10 * PAGE);
  });

  it('cannot be removed by model code', () => {
    const Memory = fakeMemoryCtor();
    installWasmMemoryCap(4 * PAGE, Memory as unknown as { prototype: WebAssembly.Memory });
    const proto = Memory.prototype as unknown as Record<string, unknown>;
    expect(() => { 'use strict'; proto.grow = () => 0; }).toThrow(TypeError);
    expect(() => Object.defineProperty(Memory.prototype, 'grow', { value: () => 0 })).toThrow(TypeError);
    expect(() => new Memory(1).grow(10)).toThrow(/memory cap/);
  });
});
