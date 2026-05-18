import { describe, it, expect, beforeAll } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isKernelError } from '../../../src/shared/intent/kernelError';

describe('surfaceFromBoundary()', () => {
  beforeAll(async () => {
    // Capture-time corner-coincidence validation runs the lazy curve
    // evaluators, which require OCCT for `pointAt(0)` / `pointAt(1)`. The
    // capture method also falls back to control-point endpoints if OCCT
    // isn't ready, but we exercise the canonical path here.
    await initOcct();
  });

  it('captures a SurfaceProxy from 4 line-segment boundary curves', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c1 = kcad.nurbsCurve([[0, 0, 0], [10, 0, 0]], { degree: 1 });
    const c2 = kcad.nurbsCurve([[10, 0, 0], [10, 10, 0]], { degree: 1 });
    const c3 = kcad.nurbsCurve([[10, 10, 0], [0, 10, 0]], { degree: 1 });
    const c4 = kcad.nurbsCurve([[0, 10, 0], [0, 0, 0]], { degree: 1 });

    const surface = kcad.surfaceFromBoundary([c1, c2, c3, c4]);
    expect(surface.id).toMatch(/^surface_/);
    const rec = session.getSurfaceRecord(surface.id);
    expect(rec).toBeDefined();
    expect(rec!.kind).toBe('coonsPatch');
    expect(rec!.data.kind).toBe('coonsPatch');
    if (rec!.data.kind === 'coonsPatch') {
      expect(rec!.data.curveIds).toEqual([c1.id, c2.id, c3.id, c4.id]);
      expect(rec!.data.continuity).toEqual(['C0', 'C0', 'C0', 'C0']);
    }
    expect(rec!.diagnostics).toBeUndefined();
  });

  it('emits feature.surface-from-boundary.corner-mismatch when endpoints do not coincide', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c1 = kcad.nurbsCurve([[0, 0, 0], [10, 0, 0]], { degree: 1 });
    // discontinuous start — does not match c1.end (10, 0, 0).
    const c2 = kcad.nurbsCurve([[99, 99, 99], [10, 10, 0]], { degree: 1 });
    const c3 = kcad.nurbsCurve([[10, 10, 0], [0, 10, 0]], { degree: 1 });
    const c4 = kcad.nurbsCurve([[0, 10, 0], [0, 0, 0]], { degree: 1 });

    const surface = kcad.surfaceFromBoundary([c1, c2, c3, c4]);
    const rec = session.getSurfaceRecord(surface.id);
    expect(rec).toBeDefined();
    expect(rec!.diagnostics?.some((d) => d.code === 'feature.surface-from-boundary.corner-mismatch')).toBe(true);
  });

  it('throws feature.surface-from-boundary.too-few-curves with fewer than 4 curves', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c1 = kcad.nurbsCurve([[0, 0, 0], [10, 0, 0]], { degree: 1 });
    const c2 = kcad.nurbsCurve([[10, 0, 0], [10, 10, 0]], { degree: 1 });
    const c3 = kcad.nurbsCurve([[10, 10, 0], [0, 0, 0]], { degree: 1 });
    try {
      // @ts-expect-error — intentionally passing wrong arity for runtime gate.
      kcad.surfaceFromBoundary([c1, c2, c3]);
      throw new Error('expected throw');
    } catch (e) {
      expect(isKernelError(e)).toBe(true);
      if (isKernelError(e)) {
        expect(e.code).toBe('feature.surface-from-boundary.too-few-curves');
      }
    }
  });

  it('throws feature.surface-from-boundary.too-many-curves with more than 4 curves', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c1 = kcad.nurbsCurve([[0, 0, 0], [5, 0, 0]], { degree: 1 });
    const c2 = kcad.nurbsCurve([[5, 0, 0], [10, 0, 0]], { degree: 1 });
    const c3 = kcad.nurbsCurve([[10, 0, 0], [10, 10, 0]], { degree: 1 });
    const c4 = kcad.nurbsCurve([[10, 10, 0], [0, 10, 0]], { degree: 1 });
    const c5 = kcad.nurbsCurve([[0, 10, 0], [0, 0, 0]], { degree: 1 });
    try {
      // @ts-expect-error — intentionally passing wrong arity for runtime gate.
      kcad.surfaceFromBoundary([c1, c2, c3, c4, c5]);
      throw new Error('expected throw');
    } catch (e) {
      expect(isKernelError(e)).toBe(true);
      if (isKernelError(e)) {
        expect(e.code).toBe('feature.surface-from-boundary.too-many-curves');
      }
    }
  });

  it('accepts a per-edge continuity array', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const c1 = kcad.nurbsCurve([[0, 0, 0], [10, 0, 0]], { degree: 1 });
    const c2 = kcad.nurbsCurve([[10, 0, 0], [10, 10, 0]], { degree: 1 });
    const c3 = kcad.nurbsCurve([[10, 10, 0], [0, 10, 0]], { degree: 1 });
    const c4 = kcad.nurbsCurve([[0, 10, 0], [0, 0, 0]], { degree: 1 });

    const surface = kcad.surfaceFromBoundary([c1, c2, c3, c4], {
      continuity: ['C1', 'C0', 'C1', 'C0'],
    });
    const rec = session.getSurfaceRecord(surface.id);
    if (rec?.data.kind === 'coonsPatch') {
      expect(rec.data.continuity).toEqual(['C1', 'C0', 'C1', 'C0']);
    } else {
      throw new Error('expected coonsPatch record');
    }
  });
});
