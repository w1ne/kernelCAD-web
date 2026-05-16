import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { isKernelError } from '../../../src/shared/intent/kernelError';

/** Assert that calling `fn` throws a KernelError with the given code. */
function expectKernelErrorCode(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (e) {
    expect(isKernelError(e)).toBe(true);
    if (isKernelError(e)) expect(e.code).toBe(code);
    return;
  }
  throw new Error(`expected fn to throw KernelError with code ${code}`);
}

describe('nurbsSurface API', () => {
  it('captures a valid 2x2 surface', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const surf = api.nurbsSurface({
      controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
      degree: { u: 1, v: 1 },
    });
    expect(surf.id).toBe('surface_1');
    expect(session.getSurfaceRecord('surface_1')?.kind).toBe('nurbsSurface');
  });

  it('feature.nurbs.degenerate-controls when controls is empty', () => {
    const api = createApi({ session: new CaptureSession() });
    expectKernelErrorCode(
      () => api.nurbsSurface({ controls: [], degree: { u: 1, v: 1 } }),
      'feature.nurbs.degenerate-controls',
    );
  });

  it('feature.nurbs.degenerate-controls when grid is jagged', () => {
    const api = createApi({ session: new CaptureSession() });
    expectKernelErrorCode(
      () => api.nurbsSurface({
        controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0]]],
        degree: { u: 1, v: 1 },
      }),
      'feature.nurbs.degenerate-controls',
    );
  });

  it('feature.nurbs.degenerate-controls when a control point is non-finite', () => {
    const api = createApi({ session: new CaptureSession() });
    expectKernelErrorCode(
      () => api.nurbsSurface({
        controls: [[[NaN, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
        degree: { u: 1, v: 1 },
      }),
      'feature.nurbs.degenerate-controls',
    );
  });

  it('feature.nurbs.degree-mismatch when degree.u >= nU', () => {
    const api = createApi({ session: new CaptureSession() });
    expectKernelErrorCode(
      () => api.nurbsSurface({
        controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
        degree: { u: 2, v: 1 },
      }),
      'feature.nurbs.degree-mismatch',
    );
  });

  it('feature.nurbs.degree-mismatch when degree.u < 1', () => {
    const api = createApi({ session: new CaptureSession() });
    expectKernelErrorCode(
      () => api.nurbsSurface({
        controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
        degree: { u: 0, v: 1 },
      }),
      'feature.nurbs.degree-mismatch',
    );
  });

  it('feature.nurbs.degenerate-controls when weights grid is non-rectangular', () => {
    const api = createApi({ session: new CaptureSession() });
    expectKernelErrorCode(
      () => api.nurbsSurface({
        controls: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]],
        weights: [[1, 1], [1]],
        degree: { u: 1, v: 1 },
      }),
      'feature.nurbs.degenerate-controls',
    );
  });

  it('surfaceFromCurves rejects fewer than 2 sections', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const sk = api.path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 10).lineTo(0, 10).close();
    expectKernelErrorCode(() => api.surfaceFromCurves([sk]), 'feature.invalid-args');
  });
});
