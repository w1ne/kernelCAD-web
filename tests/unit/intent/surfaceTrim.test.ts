// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { SurfaceProxy } from '../../../src/modeling/capture/surfaceProxy';
import type { SurfaceTrimData } from '../../../src/shared/intent/surfaceRecord';

const UNIT_PATCH = {
  kind: 'nurbsSurface' as const,
  controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]] as [number, number, number][][],
  degree: { u: 1, v: 1 },
};

describe('SurfaceProxy.trimTo', () => {
  it('mints a surfaceTrim record referencing the cutter surface', () => {
    const session = new CaptureSession();
    const s = session.addNurbsSurface(UNIT_PATCH);
    const cutter = session.addNurbsSurface(UNIT_PATCH);
    const trimmed = s.trimTo(cutter);
    expect(trimmed).toBeInstanceOf(SurfaceProxy);
    const rec = session.getSurfaceRecord(trimmed.id);
    expect(rec?.kind).toBe('surfaceTrim');
    const data = rec?.data as SurfaceTrimData;
    expect(data.op).toBe('trim');
    expect(data.surfaceId).toBe(s.id);
    expect((data.byRef as { surfaceId: string }).surfaceId).toBe(cutter.id);
  });

  it('mints a surfaceTrim record with op=split for .split()', () => {
    const session = new CaptureSession();
    const s = session.addNurbsSurface(UNIT_PATCH);
    const cutter = session.addNurbsSurface(UNIT_PATCH);
    const split = s.split(cutter);
    expect(split).toBeInstanceOf(SurfaceProxy);
    const rec = session.getSurfaceRecord(split.id);
    expect(rec?.kind).toBe('surfaceTrim');
    const data = rec?.data as SurfaceTrimData;
    expect(data.op).toBe('split');
    expect(data.surfaceId).toBe(s.id);
    expect((data.byRef as { surfaceId: string }).surfaceId).toBe(cutter.id);
  });

  it('trimTo requires a Surface cutter (Shape/Curve3D cutters deferred to a later slice)', () => {
    const session = new CaptureSession();
    const s = session.addNurbsSurface(UNIT_PATCH);
    const shape = session.createShape({ kind: 'box', inputs: {}, params: { x: { expression: '10', unit: 'mm', evaluated: 10 }, y: { expression: '10', unit: 'mm', evaluated: 10 }, z: { expression: '10', unit: 'mm', evaluated: 10 } } });
    // @ts-expect-error — Shape cutters are deferred; trimTo only accepts a SurfaceProxy.
    // If the type widens to accept Shape again, TS will flag this @ts-expect-error as unused.
    s.trimTo(shape);
  });

  it('trimTo returns a fresh SurfaceProxy with a new incremented id', () => {
    const session = new CaptureSession();
    const s = session.addNurbsSurface(UNIT_PATCH);
    const cutter = session.addNurbsSurface(UNIT_PATCH);
    expect(s.id).toBe('surface_1');
    expect(cutter.id).toBe('surface_2');
    const trimmed = s.trimTo(cutter);
    expect(trimmed.id).toBe('surface_3');
  });
});
