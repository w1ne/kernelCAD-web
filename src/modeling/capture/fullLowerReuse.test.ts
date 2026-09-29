// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.lower() reuses the session's last full lower for any record whose
// prefix is unchanged — and must NOT reuse it once a transform, a new record
// in the prefix, or a param value changes what that record lowers to.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { CaptureSession } from './captureSession';
import { createModelingApi } from '../api';

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('Shape.lower() full-lower reuse', () => {
  it('a second shape reuses the first lower; appended records do not invalidate it', async () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const a = k.box(10, 10, 10).subtract(k.cylinder(12, 2).translate(5, 5, -1));
    const b = k.box(4, 4, 4).translate(20, 0, 0);
    const runs = vi.spyOn(RecomputeEngine.prototype, 'run');
    await a.lower();
    k.sphere(3); // appended record after both shapes
    const lb = await b.lower();
    expect(runs).toHaveBeenCalledTimes(1);
    expect(lb.boundingBox().min[0]).toBeCloseTo(20, 6);
    runs.mockRestore();
  });

  it('a transform appended to the shape re-lowers it', async () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const a = k.box(10, 10, 10);
    const b = k.box(4, 4, 4);
    await a.lower();
    b.translate(50, 0, 0);
    expect((await b.lower()).boundingBox().min[0]).toBeCloseTo(50, 6);
  });

  it('a param change re-lowers', async () => {
    const session = new CaptureSession();
    const k = createModelingApi({ session });
    const w = k.param('w', 10);
    const a = k.box(w, 10, 10);
    const b = k.box(w, 5, 5);
    await a.lower();
    session.paramTable.set('w', 30);
    expect((await b.lower()).boundingBox().max[0]).toBeCloseTo(30, 6);
  });
});
