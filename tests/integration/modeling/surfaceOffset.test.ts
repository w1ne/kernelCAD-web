// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Surface.offset(distance) — standalone normal offset. The NURBS skill listed
// this as deferred; these tests pin the measured planar and curved behavior,
// the signed direction, ParamRef resolution, invalid input refusal, and the
// downstream thicken path.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { KernelError } from '../../../src/shared/intent/kernelError';

const PLANE_CONTROLS = [
  [[0, 0, 0], [0, 10, 0]],
  [[10, 0, 0], [10, 10, 0]],
];
const CURVED_CONTROLS = [
  [[0, 0, 0], [0, 5, 1], [0, 10, 0]],
  [[5, 0, 1], [5, 5, 2], [5, 10, 1]],
  [[10, 0, 0], [10, 5, 1], [10, 10, 0]],
];

function apiWithSession() {
  const session = new CaptureSession();
  return { session, api: createModelingApi({ session }) };
}

describe('Surface.offset', () => {
  beforeAll(async () => { await initOcct(); });

  it('offsets a planar patch +5 mm along its normal with unchanged area', async () => {
    const { api } = apiWithSession();
    const base = api.nurbsSurface({ controls: PLANE_CONTROLS, degree: { u: 1, v: 1 } });
    const offset = base.offset(5);
    const backend = await offset.toShape().lower();

    const bb = backend.boundingBox();
    expect(bb.min[2]).toBeGreaterThanOrEqual(5 - 1e-4);
    expect(bb.max[2]).toBeLessThanOrEqual(5 + 1e-4);
    expect(bb.max[0] - bb.min[0]).toBeCloseTo(10, 4);
    expect(bb.max[1] - bb.min[1]).toBeCloseTo(10, 4);
    expect(backend.surfaceArea()).toBeCloseTo(100, 4);
    expect(Math.abs(backend.volume())).toBeLessThan(1e-3);
  });

  it('offsets a planar patch -3 mm against its normal', async () => {
    const { api } = apiWithSession();
    const base = api.nurbsSurface({ controls: PLANE_CONTROLS, degree: { u: 1, v: 1 } });
    const backend = await base.offset(-3).toShape().lower();

    const bb = backend.boundingBox();
    expect(bb.min[2]).toBeGreaterThanOrEqual(-3 - 1e-4);
    expect(bb.max[2]).toBeLessThanOrEqual(-3 + 1e-4);
    expect(backend.surfaceArea()).toBeCloseTo(100, 4);
  });

  it('offsets a curved patch and raises its peak by the requested normal distance', async () => {
    const { api } = apiWithSession();
    const base = api.nurbsSurface({ controls: CURVED_CONTROLS, degree: { u: 2, v: 2 } });
    const baseBox = (await base.toShape().lower()).boundingBox();
    const offsetBox = (await base.offset(1).toShape().lower()).boundingBox();

    // The centre normal is +Z, so the peak rises by ~1 mm. The corners move
    // along tilted normals, so this checks the measured peak, not a translation.
    expect(offsetBox.max[2] - baseBox.max[2]).toBeGreaterThan(0.8);
    expect(offsetBox.max[2] - baseBox.max[2]).toBeLessThan(1.2);
  });

  it('resolves a ParamRef distance at lower time', async () => {
    const { api, session } = apiWithSession();
    const distance = api.param('offsetDistance', 2, { min: -10, max: 10 });
    const base = api.nurbsSurface({ controls: PLANE_CONTROLS, degree: { u: 1, v: 1 } });
    const shape = base.offset(distance).toShape();

    session.paramTable.set('offsetDistance', 7);
    const bb = (await shape.lower()).boundingBox();
    expect(bb.min[2]).toBeGreaterThanOrEqual(7 - 1e-4);
    expect(bb.max[2]).toBeLessThanOrEqual(7 + 1e-4);
  });

  it('keeps the offset face usable downstream by thickening it into a solid', async () => {
    const { api } = apiWithSession();
    const base = api.nurbsSurface({ controls: PLANE_CONTROLS, degree: { u: 1, v: 1 } });
    const solid = await base.offset(4).thicken(1.5).lower();

    expect(solid.volume()).toBeCloseTo(100 * 1.5, 1);
    const bb = solid.boundingBox();
    expect(bb.min[2]).toBeGreaterThanOrEqual(4 - 1e-4);
    expect(bb.max[2]).toBeCloseTo(5.5, 2);
  });

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a non-offset distance %s without registering a surface',
    (distance) => {
      const { api, session } = apiWithSession();
      const base = api.nurbsSurface({ controls: PLANE_CONTROLS, degree: { u: 1, v: 1 } });
      const before = session.getSurfaceRecords().length;
      expect(() => base.offset(distance)).toThrow(KernelError);
      try {
        base.offset(distance);
      } catch (error) {
        expect((error as KernelError).code).toBe('feature.invalid-args');
        expect((error as KernelError).message).toContain('non-zero finite');
      }
      expect(session.getSurfaceRecords().length).toBe(before);
    },
  );

  it('offsets a skinned surface from sketches after resolving its sections', async () => {
    const { api } = apiWithSession();
    const square = (x: number) => api.path()
      .moveTo(x, 0)
      .lineTo(x + 10, 0)
      .lineTo(x + 10, 10)
      .lineTo(x, 10)
      .close();
    const base = api.surfaceFromCurves([square(0), square(0)]);
    const backend = await base.offset(1).toShape().lower();

    expect(backend.surfaceArea()).toBeGreaterThan(0);
    expect(backend.solidComponents().length).toBe(0);
  });

  it('carries a trim cutter feature through an offset and keeps the trimmed area', async () => {
    const { api } = apiWithSession();
    const base = api.nurbsSurface({ controls: PLANE_CONTROLS, degree: { u: 1, v: 1 } });
    const body = api.box(10, 6, 4).translate(5, 2, -2);
    const trimmed = base.trimTo(body);
    const backend = await trimmed.offset(1).toShape().lower();

    // The body removes a 5 x 6 mm bite (30 mm²); trim keeps the 70 mm² piece.
    expect(backend.surfaceArea()).toBeGreaterThan(65);
    expect(backend.surfaceArea()).toBeLessThan(75);
    expect(backend.solidComponents().length).toBe(0);
  });

  it('refuses a ParamRef that resolves to zero at lower time', async () => {
    const { api, session } = apiWithSession();
    const distance = api.param('zeroOffset', 0);
    const base = api.nurbsSurface({ controls: PLANE_CONTROLS, degree: { u: 1, v: 1 } });
    base.offset(distance).toShape();

    const result = await new RecomputeEngine(createOcctLowerer(session))
      .run(session.getRecords(), { paramTable: session.paramTable });
    expect(result.diagnostics.some(d => d.code === 'feature.invalid-args')).toBe(true);
  });
});
