// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// pipe() rejects a misplaced or unknown option instead of dropping it:
// `pipe(pts, 3, 8)` and `pipe(pts, 3, { bend_radius: 8 })` used to build
// the default 1.5 × radius bend with no diagnostic.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../src/modeling/api';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { KernelError } from '../../src/shared/intent/kernelError';
import type { Vec3 } from '../../src/shared/intent/types';

const PTS: Vec3[] = [[0, 0, 0], [40, 0, 0], [40, 0, 30]];

function setup() {
  const session = new CaptureSession();
  session.setEngine(new RecomputeEngine(createOcctLowerer(session)));
  return { session, api: createModelingApi({ session }) };
}

function caught(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected a KernelError');
}

describe('pipe option keys', () => {
  beforeAll(async () => { await initOcct(); });

  it.each([
    [{ bend_radius: 8 }, 'bend_radius'],
    [{ bendRadius: 8, segments: 16 }, 'segments'],
    [{ radius: 8 }, 'radius'],
  ])('rejects the unknown option in %j', (bag, key) => {
    const { session, api } = setup();
    const err = caught(() => api.pipe(PTS, 3, bag as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain(`unknown option '${key}'`);
    expect(err.message).toContain('bendRadius');
    expect(session.getRecords()).toHaveLength(0);
  });

  it.each([[8], ['8'], [[8]], [true]])('rejects a non-object opts %j', (opts) => {
    const { session, api } = setup();
    const err = caught(() => api.pipe(PTS, 3, opts as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('not a positional argument');
    expect(session.getRecords()).toHaveLength(0);
  });

  it.each([[undefined], [null], [{}]])('keeps the 1.5 × radius default for opts %j', (opts) => {
    const { session, api } = setup();
    api.pipe(PTS, 4, opts as never);
    const [rec] = session.getRecords();
    expect(rec?.kind).toBe('pipe');
    expect(rec?.params.bendRadius).toMatchObject({ evaluated: 6 });
  });

  it('records an explicit bendRadius', () => {
    const { session, api } = setup();
    api.pipe(PTS, 3, { bendRadius: 8 });
    const [rec] = session.getRecords();
    expect(rec?.params.bendRadius).toMatchObject({ evaluated: 8 });
  });
});
