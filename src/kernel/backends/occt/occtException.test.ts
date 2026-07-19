// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression cover for the `24` incident: two parts catalog STEPs were reported
// as corrupt because `lib.fetchPart` rendered an OCCT out-of-memory throw as the
// bare string "24" under the hint "file is not a valid STEP solid". The files
// were fine. `24` is `__cxa_allocate_exception`'s `malloc(size + 24) + 24` with
// a null malloc — the signature of an exhausted wasm heap.

import { describe, it, expect } from 'vitest';
import {
  describeOcctThrow,
  isOcctOutOfMemory,
  isOutOfMemoryMessage,
  isRawOcctThrow,
  OUT_OF_MEMORY_MARKER,
} from './occtException';

describe('isOcctOutOfMemory', () => {
  it('recognizes 24 — the exact pointer a null malloc produces', () => {
    // __cxa_allocate_exception(size) = _malloc(size + 24) + 24; malloc → 0.
    expect(isOcctOutOfMemory(24)).toBe(true);
  });

  it('recognizes any sub-static-base pointer, not just 24', () => {
    // The same arithmetic applies to every C++ exception type OCCT throws once
    // malloc starts returning null, so the header offset is not always 24.
    expect(isOcctOutOfMemory(0)).toBe(true);
    expect(isOcctOutOfMemory(16)).toBe(true);
    expect(isOcctOutOfMemory(1023)).toBe(true);
  });

  it('does not claim a genuine heap-allocated exception pointer is an OOM', () => {
    // Emscripten static data starts at 1024; real allocations land far above it.
    expect(isOcctOutOfMemory(1024)).toBe(false);
    expect(isOcctOutOfMemory(5_600_432)).toBe(false);
  });

  it('ignores non-numeric throws', () => {
    expect(isOcctOutOfMemory(new Error('boom'))).toBe(false);
    expect(isOcctOutOfMemory('24')).toBe(false);
    expect(isOcctOutOfMemory(undefined)).toBe(false);
    expect(isOcctOutOfMemory(24.5)).toBe(false);
  });
});

describe('isRawOcctThrow', () => {
  it('separates bare Emscripten pointers from real Errors', () => {
    expect(isRawOcctThrow(5_600_432)).toBe(true);
    expect(isRawOcctThrow(new Error('nope'))).toBe(false);
  });
});

describe('describeOcctThrow', () => {
  it('never renders an OOM as a bare number', () => {
    const msg = describeOcctThrow(24);
    expect(msg).not.toBe('24');
    expect(msg).toContain(OUT_OF_MEMORY_MARKER);
    // The whole point: say it is NOT the input's fault.
    expect(msg).toContain('not a problem with the input geometry');
  });

  it('labels an opaque pointer as opaque instead of implying meaning', () => {
    const msg = describeOcctThrow(5_600_432);
    expect(msg).toContain('5600432');
    expect(msg).toContain('no message is recoverable');
  });

  it('passes Error messages through unchanged', () => {
    expect(describeOcctThrow(new Error('Failed to load STEP file'))).toBe(
      'Failed to load STEP file',
    );
  });
});

describe('isOutOfMemoryMessage', () => {
  it('matches a wrapped failure by its hint marker', () => {
    expect(
      isOutOfMemoryMessage({
        message: 'lib.fetchPart: ...',
        hint: 'kernel-failed.lib.fetchPart.out-of-memory — the catalog STEP is NOT invalid',
      }),
    ).toBe(true);
  });

  it('matches a wrapped failure by its message marker', () => {
    expect(isOutOfMemoryMessage(new Error(`x: ${OUT_OF_MEMORY_MARKER} (ptr 24)`))).toBe(true);
  });

  it('does not match an ordinary parse failure', () => {
    expect(
      isOutOfMemoryMessage({
        message: 'inspectStepFile: replicad failed to parse STEP',
        hint: 'kernel-failed.inspect.step.parse — file is not a valid STEP model',
      }),
    ).toBe(false);
    expect(isOutOfMemoryMessage(null)).toBe(false);
    expect(isOutOfMemoryMessage(24)).toBe(false);
  });
});
