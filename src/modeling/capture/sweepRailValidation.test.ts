// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sweepRailValidation.test.ts
//
// Regression: `Sketch.sweep(rail)` used to blow the stack with an opaque
// "Maximum call stack size exceeded" when a `path()`/PathBuilder/Sketch was
// passed as the rail (the natural mistake — profiles are paths). The rail
// object carries a back-reference to the session, whose `records` array holds
// the freshly-registered sweep record, so `collectParamRefs` walked
// session → records → record → metadata.rail → session forever.
//
// Two complementary guards are asserted here:
//   1. `collectParamRefs` tolerates cyclic graphs (root robustness).
//   2. `Sketch.sweep` rejects a non-Vec3[] rail with a recoverable
//      `feature.invalid-args` diagnostic instead of a RangeError.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';
import { collectParamRefs } from '../../shared/runtime/resolveParams';

function makeApi() {
  const session = new CaptureSession();
  return createApi({ session });
}

function squareProfile(kcad: ReturnType<typeof createApi>) {
  return kcad.path().moveTo(0, 0).lineTo(6, 0).lineTo(6, 6).lineTo(0, 6).close();
}

describe('collectParamRefs — cycle safety', () => {
  it('terminates on a self-referential object instead of overflowing the stack', () => {
    const a: Record<string, unknown> = { keep: 'x' };
    a.self = a; // direct cycle
    const b: Record<string, unknown> = { a };
    a.b = b; // mutual cycle
    expect(() => collectParamRefs(a)).not.toThrow();
    expect(collectParamRefs(a) instanceof Set).toBe(true);
  });
});

describe('Sketch.sweep — rail validation', () => {
  it('throws a recoverable feature.invalid-args (not a stack overflow) for a path() rail', () => {
    const kcad = makeApi();
    const profile = squareProfile(kcad);
    const railPath = kcad.path().moveTo(40, 20).lineTo(70, 25).lineTo(70, 70).lineTo(40, 75);
    let caught: unknown;
    try {
      // @ts-expect-error — deliberately passing a PathBuilder where Vec3[] is expected
      profile.sweep(railPath);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('feature.invalid-args');
    expect((caught as Error).message).not.toMatch(/call stack/i);
  });

  it('rejects a too-short rail with feature.invalid-args', () => {
    const kcad = makeApi();
    const profile = squareProfile(kcad);
    expect(() => profile.sweep([[0, 0, 0]])).toThrow(KernelError);
  });

  it('accepts a valid Vec3[] rail at capture time', () => {
    const kcad = makeApi();
    const profile = squareProfile(kcad);
    expect(() => profile.sweep([[40, 20, 0], [70, 25, 0], [70, 70, 0], [40, 75, 0]])).not.toThrow();
  });
});
