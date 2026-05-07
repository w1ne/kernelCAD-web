import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

describe('assembly capture contract', () => {
  it('captures named parts and a revolute joint as inspectable intent records', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('two-link arm');
    const baseShape = kcad.box(30, 30, 8);
    const linkShape = kcad.box(80, 12, 8).translate(40, 0, 8);

    const base = arm.part('base', baseShape, { at: [0, 0, 0] });
    const link = arm.part('link', linkShape, { at: [0, 0, 8] });
    const shoulder = arm.revolute('shoulder', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 8],
      limitsDeg: [-90, 90],
    });

    expect(base.id).toMatch(/^assemblyPart_/);
    expect(link.id).toMatch(/^assemblyPart_/);
    expect(shoulder.id).toMatch(/^assemblyJoint_/);

    const records = session.getRecords();
    expect(records.find(r => r.id === base.id)).toMatchObject({
      kind: 'assemblyPart',
      inputs: { shape: { kind: 'feature', id: baseShape.id } },
      metadata: {
        assemblyName: 'two-link arm',
        partName: 'base',
        at: [0, 0, 0],
      },
    });
    expect(records.find(r => r.id === link.id)).toMatchObject({
      kind: 'assemblyPart',
      inputs: { shape: { kind: 'feature', id: linkShape.id } },
      metadata: {
        assemblyName: 'two-link arm',
        partName: 'link',
        at: [0, 0, 8],
      },
    });
    expect(records.find(r => r.id === shoulder.id)).toMatchObject({
      kind: 'assemblyJoint',
      inputs: {
        a: { kind: 'feature', id: base.id },
        b: { kind: 'feature', id: link.id },
      },
      metadata: {
        assemblyName: 'two-link arm',
        jointName: 'shoulder',
        jointKind: 'revolute',
        axis: [0, 0, 1],
        origin: [0, 0, 8],
        limitsDeg: [-90, 90],
      },
    });
  });

  it('rejects invalid revolute joint axes before capture', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('invalid joint');
    const a = arm.part('a', kcad.box(10, 10, 10));
    const b = arm.part('b', kcad.box(10, 10, 10));

    expect(() => arm.revolute('bad', a, b, {
      axis: [0, Number.NaN, 1],
      origin: [0, 0, 0],
    })).toThrow(/revolute joint axis must be a finite Vec3/);
  });
});
