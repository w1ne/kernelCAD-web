// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Task 4 — capture layer for sew(surfaces, opts?).
// NO OCCT/geometry — pure capture-record assertions.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { Shape } from '../../../src/modeling/capture/proxy';
import { KernelError } from '../../../src/shared/intent/kernelError';

const UNIT_PATCH = {
  kind: 'nurbsSurface' as const,
  controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]] as [number, number, number][][],
  degree: { u: 1, v: 1 },
};

describe('sew() capture record', () => {
  it('mints a surfaceSew FeatureRecord with kind=surfaceSew', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s1 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const s2 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const result = api.sew([s1, s2]);
    expect(result).toBeInstanceOf(Shape);
    const records = session.getRecords();
    const sewRec = records.find(r => r.id === result.id);
    expect(sewRec).toBeDefined();
    expect(sewRec!.kind).toBe('surfaceSew');
  });

  it('record has data.requireClosed default false', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s1 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const s2 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const result = api.sew([s1, s2]);
    const sewRec = session.getRecords().find(r => r.id === result.id);
    expect(sewRec!.metadata).toBeDefined();
    expect((sewRec!.metadata as { requireClosed?: boolean }).requireClosed).toBe(false);
  });

  it('record has data.requireClosed=true when opts.requireClosed=true', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s1 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const s2 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const result = api.sew([s1, s2], { requireClosed: true });
    const sewRec = session.getRecords().find(r => r.id === result.id);
    expect((sewRec!.metadata as { requireClosed?: boolean }).requireClosed).toBe(true);
  });

  it('inputs map contains a surface ref for each input surface', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s1 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const s2 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const s3 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const result = api.sew([s1, s2, s3]);
    const sewRec = session.getRecords().find(r => r.id === result.id);
    expect(sewRec).toBeDefined();
    const inputs = sewRec!.inputs;
    expect(Object.keys(inputs)).toHaveLength(3);
    expect(inputs['surface_0']).toEqual({ kind: 'surface', surfaceId: s1.id });
    expect(inputs['surface_1']).toEqual({ kind: 'surface', surfaceId: s2.id });
    expect(inputs['surface_2']).toEqual({ kind: 'surface', surfaceId: s3.id });
  });

  it('record has a params.tolerance entry', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s1 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const s2 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const result = api.sew([s1, s2]);
    const sewRec = session.getRecords().find(r => r.id === result.id);
    expect(sewRec!.params['tolerance']).toBeDefined();
    expect((sewRec!.params['tolerance'] as { evaluated: number }).evaluated).toBeCloseTo(1e-6, 10);
  });

  it('params.tolerance respects opts.tolerance', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s1 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const s2 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const result = api.sew([s1, s2], { tolerance: 0.01 });
    const sewRec = session.getRecords().find(r => r.id === result.id);
    expect((sewRec!.params['tolerance'] as { evaluated: number }).evaluated).toBeCloseTo(0.01, 10);
  });

  it('throws feature.invalid-args when fewer than 1 surface is provided', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.sew([])).toThrowError(KernelError);
    try {
      api.sew([]);
    } catch (e) {
      expect((e as KernelError).code).toBe('feature.invalid-args');
    }
  });

  it('throws feature.invalid-args for non-array input', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.sew(null as unknown as [])).toThrowError(KernelError);
  });

  it('sew with a single surface is accepted (open shell with 1 face)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s1 = api.nurbsSurface({ controls: UNIT_PATCH.controls, degree: UNIT_PATCH.degree });
    const result = api.sew([s1]);
    expect(result).toBeInstanceOf(Shape);
    const sewRec = session.getRecords().find(r => r.id === result.id);
    expect(sewRec!.kind).toBe('surfaceSew');
  });
});
