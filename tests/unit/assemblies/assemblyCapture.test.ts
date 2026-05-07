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

  it('captures assembly.model() as one aggregate feature over all placed parts', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const lamp = kcad.assembly('desk lamp');
    const base = lamp.part('base', kcad.box(40, 40, 6), { at: [0, 0, 0] });
    const arm = lamp.part('arm', kcad.box(80, 8, 8), { at: [35, 16, 20] });

    const model = lamp.model();

    expect(model.id).toMatch(/^assemblyModel_/);
    expect(session.getRecords().at(-1)).toMatchObject({
      kind: 'assemblyModel',
      inputs: {
        part_0: { kind: 'feature', id: base.id },
        part_1: { kind: 'feature', id: arm.id },
      },
      metadata: {
        assemblyName: 'desk lamp',
        partIds: [base.id, arm.id],
      },
    });
  });

  it('rejects assembly.model() when no parts have been captured', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    expect(() => kcad.assembly('empty').model()).toThrow(/assembly.model requires at least one part/);
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

  it('captures named connector frames and fixed placement between parts', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('connector arm');
    const base = arm.part('base', kcad.box(20, 20, 8), {
      at: [0, 0, 0],
      connectors: {
        shoulder: { origin: [10, 0, 8], axis: [0, 0, 1] },
      },
    });
    const link = arm.part('link', kcad.box(60, 8, 6), {
      connectors: {
        root: { origin: [-30, 0, 0], axis: [0, 0, 1] },
      },
      connect: {
        connector: 'root',
        to: base.connector('shoulder'),
        name: 'shoulder-fixed',
      },
    });

    const records = session.getRecords();
    expect(records.find(r => r.id === base.id)).toMatchObject({
      kind: 'assemblyPart',
      metadata: {
        assemblyName: 'connector arm',
        partName: 'base',
        at: [0, 0, 0],
        connectors: {
          shoulder: { origin: [10, 0, 8], axis: [0, 0, 1] },
        },
      },
    });
    expect(records.find(r => r.id === link.id)).toMatchObject({
      kind: 'assemblyPart',
      metadata: {
        assemblyName: 'connector arm',
        partName: 'link',
        at: [40, 0, 8],
        connectors: {
          root: { origin: [-30, 0, 0], axis: [0, 0, 1] },
        },
        placedBy: {
          connector: 'root',
          to: { partId: base.id, partName: 'base', connector: 'shoulder' },
        },
      },
    });
    expect(records.at(-1)).toMatchObject({
      kind: 'assemblyConnect',
      inputs: {
        a: { kind: 'feature', id: base.id },
        b: { kind: 'feature', id: link.id },
      },
      metadata: {
        assemblyName: 'connector arm',
        connectName: 'shoulder-fixed',
        kind: 'fixed',
        a: { partName: 'base', connector: 'shoulder' },
        b: { partName: 'link', connector: 'root' },
      },
    });
  });

  it('captures explicit fixed connector records between already placed parts', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const hinge = kcad.assembly('hinge');
    const leafA = hinge.part('leafA', kcad.box(30, 10, 3), {
      connectors: { pin: { origin: [15, 0, 1.5], axis: [0, 1, 0] } },
    });
    const leafB = hinge.part('leafB', kcad.box(30, 10, 3), {
      at: [30, 0, 0],
      connectors: { pin: { origin: [-15, 0, 1.5], axis: [0, 1, 0] } },
    });

    const connection = hinge.connect('pin-fixed', leafA.connector('pin'), leafB.connector('pin'));

    expect(connection.id).toMatch(/^assemblyConnect_/);
    expect(session.getRecords().at(-1)).toMatchObject({
      kind: 'assemblyConnect',
      inputs: {
        a: { kind: 'feature', id: leafA.id },
        b: { kind: 'feature', id: leafB.id },
      },
      metadata: {
        assemblyName: 'hinge',
        connectName: 'pin-fixed',
        kind: 'fixed',
        a: { partName: 'leafA', connector: 'pin', worldOrigin: [15, 0, 1.5] },
        b: { partName: 'leafB', connector: 'pin', worldOrigin: [15, 0, 1.5] },
      },
    });
  });

  it('rejects connector placement when the local connector is missing', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('bad connector');
    const base = arm.part('base', kcad.box(20, 20, 8), {
      connectors: { shoulder: { origin: [0, 0, 8] } },
    });

    expect(() => arm.part('link', kcad.box(60, 8, 6), {
      connectors: { root: { origin: [-30, 0, 0] } },
      connect: { connector: 'missing', to: base.connector('shoulder') },
    })).toThrow(/assembly.part connector 'missing' is not defined on part 'link'/);
  });

  it('rejects invalid connector frame vectors before capture', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('bad frame');

    expect(() => arm.part('base', kcad.box(20, 20, 8), {
      connectors: { shoulder: { origin: [0, Number.NaN, 8] } },
    })).toThrow(/assembly connector 'shoulder' on part 'base' origin must be a finite Vec3/);
  });
});
