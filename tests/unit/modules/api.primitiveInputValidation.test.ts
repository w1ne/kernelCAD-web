// Regression: primitives (box, cylinder, sphere) must reject non-finite /
// non-numeric inputs at capture time with a clear `feature.invalid-args`.
// Until this was wired, `cylinder({ radius, height })` (a doc-example typo)
// flowed an object through `toParam` and produced a degenerate Shape whose
// downstream lowering recursed into a "Maximum call stack size exceeded" on
// the assembly-clone path. Found while building the Luxo lamp demo
// (2026-05-25), see kernelCAD-private/docs/lineage/2026-05-25-borrow-integration-bugs.md.
import { describe, it, expect } from 'vitest';
import { createApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';

describe('Primitive input validation — finite-number check', () => {
  it('cylinder() rejects an object literal as `h`', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.cylinder({ radius: 35, height: 60 } as unknown as number, 10))
      .toThrowError(/cylinder: h must be a finite number/);
  });

  it('cylinder() rejects NaN as `r`', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.cylinder(20, NaN)).toThrowError(/cylinder: r must be a finite number/);
  });

  it('cylinder() rejects Infinity as `h`', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.cylinder(Infinity, 10)).toThrowError(/cylinder: h must be a finite number/);
  });

  it('cylinder() accepts positional numbers (no regression)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const s = api.cylinder(20, 10);
    expect(s.id).toBeDefined();
  });

  it('cylinder() accepts ParamRef coords (no regression)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const h = api.param('height', 20);
    const s = api.cylinder(h, 10);
    expect(s.id).toBeDefined();
  });

  it('box() rejects an object literal as a dimension', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.box({ w: 10 } as unknown as number, 20, 30))
      .toThrowError(/box: x must be a finite number/);
  });

  it('box() rejects NaN', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.box(10, NaN, 30)).toThrowError(/box: y must be a finite number/);
  });

  it('box() accepts positional numbers and ParamRefs (no regression)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const w = api.param('width', 100);
    expect(() => api.box(w, 50, 25)).not.toThrow();
  });

  it('sphere() rejects an object literal', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.sphere({ radius: 10 } as unknown as number))
      .toThrowError(/sphere: r must be a finite number/);
  });

  it('sphere() rejects NaN', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.sphere(NaN)).toThrowError(/sphere: r must be a finite number/);
  });

  it('sphere() accepts a positive finite number (no regression)', () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    expect(() => api.sphere(10)).not.toThrow();
  });
});
