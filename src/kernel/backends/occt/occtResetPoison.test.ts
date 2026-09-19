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
import { isOcctWasmPoisoned, WASM_POISON_MARKER } from './occtException';

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

  it('recovers sphere/box after a real embind double-free poison', async () => {
    await initOcct();
    // Reproduce the tangencySolver-class failure mode: delete a Geom handle
    // and its underlying curve (double-free) which poisons the wasm heap.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const origin = new oc.gp_Pnt2d_3(0, 0);
    const dir = new oc.gp_Dir2d_4(1, 0);
    const lin = new oc.gp_Lin2d_3(origin, dir);
    const geom = new oc.Geom2d_Line_2(lin);
    const handle = new oc.Handle_Geom2d_Curve_2(geom);
    geom.delete();
    handle.delete();

    let poisoned = false;
    try {
      OcctBackend.sphere(5);
    } catch (e) {
      poisoned = isOcctWasmPoisoned(e);
      expect(poisoned).toBe(true);
    }
    expect(poisoned).toBe(true);

    await resetOcct();

    const sphere = OcctBackend.sphere(110);
    expect(sphere.volume()).toBeGreaterThan(0);
    const box = OcctBackend.box(10, 10, 10);
    expect(box.volume()).toBeCloseTo(1000, 0);
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
