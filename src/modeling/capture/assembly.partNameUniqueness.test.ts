import { describe, it, expect } from 'vitest';
import { CaptureSession } from './captureSession';
import { createApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';

// F-foundation Task 3: Assembly.part(name, ...) and partRef.connector(name, opts)
// must reject names whose characters are reserved by the @kc[owner/kind/name]
// topology-ref grammar (., /, [, ], @, #, *, ?, ,, whitespace) and must match
// /^[A-Za-z][A-Za-z0-9_-]*$/. Without these gates, valid-looking authoring
// names could produce ambiguous or unparseable refs at resolve time.

describe('Assembly part / connector name uniqueness (F-foundation)', () => {
  it('accepts a ref-safe part name', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    expect(() => arm.part('lid', box)).not.toThrow();
  });

  it('rejects a part name containing a dot', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    expect(() => arm.part('top.bottom', box)).toThrow(KernelError);
  });

  it('rejects a part name containing a slash', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    expect(() => arm.part('arm/elbow', box)).toThrow(KernelError);
  });

  it('rejects a part name containing brackets', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    expect(() => arm.part('flange[0]', box)).toThrow(KernelError);
  });

  it('rejects a part name starting with a digit', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    expect(() => arm.part('1lid', box)).toThrow(KernelError);
  });

  it('rejects a connector name containing reserved chars in connector(name, opts)', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const box = kcad.box(10, 10, 10);
    expect(() =>
      arm.part('p1', box).connector('mount.flange', {
        type: 'frame',
        origin: { kind: 'vec3', value: [0, 0, 5] },
      }),
    ).toThrow(KernelError);
  });
});
