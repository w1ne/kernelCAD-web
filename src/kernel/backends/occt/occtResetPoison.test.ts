// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Regression: after wasm heap poison (embind double-free), even sphere()/box()
// fail with RuntimeError OOB in a long-lived Node process. resetOcct() must
// reload the OCCT module so subsequent primitives succeed.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import {
  initOcct,
  resetOcct,
  OcctBackend,
  withOcctPoisonRecovery,
} from './occtBackend';
import { WASM_POISON_MARKER } from './occtException';

describe('resetOcct — wasm poison recovery', () => {
  beforeAll(async () => {
    await initOcct();
  }, 120_000);

  it('reloads OCCT so sphere/box work after resetOcct in the same process', async () => {
    const before = OcctBackend.sphere(110);
    expect(before.volume()).toBeGreaterThan(0);

    await resetOcct();

    const sphere = OcctBackend.sphere(110);
    expect(sphere.volume()).toBeGreaterThan(0);
    expect(sphere.isEmpty()).toBe(false);

    const box = OcctBackend.box(10, 10, 10);
    expect(box.volume()).toBeCloseTo(1000, 0);
    expect(box.isEmpty()).toBe(false);
  }, 120_000);

  it('refuses an embind double delete without poisoning the heap', async () => {
    await initOcct();
    // On OCCT 7 / replicad-opencascadejs <1.0 deleting a Geom handle and its
    // curve freed the curve twice and poisoned the wasm heap (the
    // tangencySolver-class failure). OCCT 8 bindings return the curve itself
    // as the handle, so the second delete is a clean BindingError and the
    // heap stays usable — no reset needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const origin = new oc.gp_Pnt2d(0, 0);
    const dir = new oc.gp_Dir2d(1, 0);
    const lin = new oc.gp_Lin2d(origin, dir);
    const geom = new oc.Geom2d_Line(lin);
    geom.delete();
    expect(() => geom.delete()).toThrow(/already deleted/);

    const sphere = OcctBackend.sphere(110);
    expect(sphere.volume()).toBeGreaterThan(0);
    const box = OcctBackend.box(10, 10, 10);
    expect(box.volume()).toBeCloseTo(1000, 0);
    origin.delete(); dir.delete(); lin.delete();
  }, 120_000);

  it('withOcctPoisonRecovery resets and retries once', async () => {
    await initOcct();
    let calls = 0;
    const result = await withOcctPoisonRecovery(async () => {
      calls += 1;
      if (calls === 1) {
        const err = new Error('memory access out of bounds');
        err.name = 'RuntimeError';
        throw err;
      }
      return OcctBackend.box(10, 10, 10).volume();
    });
    expect(calls).toBe(2);
    expect(result).toBeCloseTo(1000, 0);
  }, 120_000);

  it('withOcctPoisonRecovery surfaces WASM_POISON_MARKER if retry still poisons', async () => {
    await initOcct();
    const err = new Error('memory access out of bounds');
    err.name = 'RuntimeError';
    await expect(
      withOcctPoisonRecovery(async () => {
        throw err;
      }),
    ).rejects.toThrow(WASM_POISON_MARKER);
  }, 120_000);
});
