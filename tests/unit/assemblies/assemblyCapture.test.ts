import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

// Vec3Param assertion helper: assembly Vec3 surfaces store as
// { x: Param, y: Param, z: Param } since Task 5 widened them to EditableVec3.
// Tests just want to read evaluated numbers, so flatten back to a Vec3 tuple.
function evaluatedXYZ(v: unknown): [number, number, number] {
  const o = v as { x: { evaluated: number }; y: { evaluated: number }; z: { evaluated: number } };
  return [o.x.evaluated, o.y.evaluated, o.z.evaluated];
}

describe('assembly capture contract', () => {
  // G0 (2026-05-31): the v0.5 `arm.revolute(...)` / `arm.fixed(...)` capture
  // shape was removed. Equivalent capture coverage for mate-style joints
  // lives in the assemblyModel `mates: [...]` round-trip test below, which
  // already exercises the canonical v0.6 surface.

  it('captures assembly.model() as one aggregate feature over all placed parts', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const lamp = kcad.assembly('desk lamp');
    const base = lamp.part('base', kcad.box(40, 40, 6), { at: [0, 0, 0] });
    const arm = lamp.part('arm', kcad.box(80, 8, 8), { at: [35, 16, 20] });

    // Per Task 14: assembly.model() returns a Scene (multi-body), not a
    // Shape — the captured `assemblyModel` FeatureRecord is still the last
    // record, so we identify it via session.getRecords().at(-1) instead of
    // chaining `.id` off the Scene.
    const model = lamp.model();
    expect(model.assemblyName).toBe('desk lamp');
    expect(model.parts.map(p => p.name)).toEqual(['base', 'arm']);

    const lastRecord = session.getRecords().at(-1)!;
    expect(lastRecord.id).toMatch(/^assemblyModel_/);
    expect(lastRecord).toMatchObject({
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

  it('captures posed mate metadata on assembly.model() for Studio joint controls', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const stroke = kcad.param('stroke', 8);
    const lift = kcad.assembly('lift');
    const sleeve = lift.part('sleeve', kcad.box(20, 20, 20));
    sleeve.connector('rail', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
    const post = lift.part('post', kcad.box(10, 10, 30));
    post.connector('slide', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
    lift.mate('height-adjust', 'sleeve.rail', 'post.slide', 'prismatic', {
      pose: stroke,
      limitsMm: [0, 20],
    });

    lift.model();

    const lastRecord = session.getRecords().at(-1)!;
    expect(lastRecord.kind).toBe('assemblyModel');
    expect(lastRecord.metadata).toMatchObject({
      assemblyName: 'lift',
      partIds: [sleeve.id, post.id],
      mates: [
        {
          name: 'height-adjust',
          a: 'sleeve.rail',
          b: 'post.slide',
          type: 'prismatic',
          pose: {
            kind: 'scalar',
            value: expect.objectContaining({
              paramRef: 'stroke',
            }),
          },
          limitsMm: [0, 20],
        },
      ],
    });
    expect(lastRecord.metadata).not.toHaveProperty('declaredMateCount');
  });

  it('rejects assembly.model() when no parts have been captured', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    expect(() => kcad.assembly('empty').model()).toThrow(/assembly.model requires at least one part/);
  });

  // G0 (2026-05-31): the v0.5 revolute-axis capture-time validation moved
  // with arm.revolute(...) when that surface was deleted. Mate-side
  // connector-axis validation (the v0.6 equivalent) is covered by the
  // assembly mate suite (see src/modeling/mates/connector.test.ts).

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
    const baseRecord = records.find(r => r.id === base.id);
    expect(baseRecord).toMatchObject({
      kind: 'assemblyPart',
      metadata: {
        assemblyName: 'connector arm',
        partName: 'base',
      },
    });
    const baseMeta = baseRecord!.metadata as {
      at: unknown;
      connectors: { shoulder: { origin: unknown; axis: unknown } };
    };
    expect(evaluatedXYZ(baseMeta.at)).toEqual([0, 0, 0]);
    expect(evaluatedXYZ(baseMeta.connectors.shoulder.origin)).toEqual([10, 0, 8]);
    expect(evaluatedXYZ(baseMeta.connectors.shoulder.axis)).toEqual([0, 0, 1]);

    const linkRecord = records.find(r => r.id === link.id);
    expect(linkRecord).toMatchObject({
      kind: 'assemblyPart',
      metadata: {
        assemblyName: 'connector arm',
        partName: 'link',
        placedBy: {
          connector: 'root',
          to: { partId: base.id, partName: 'base', connector: 'shoulder' },
        },
      },
    });
    const linkMeta = linkRecord!.metadata as {
      at: unknown;
      connectors: { root: { origin: unknown; axis: unknown } };
    };
    expect(evaluatedXYZ(linkMeta.at)).toEqual([40, 0, 8]);
    expect(evaluatedXYZ(linkMeta.connectors.root.origin)).toEqual([-30, 0, 0]);
    expect(evaluatedXYZ(linkMeta.connectors.root.axis)).toEqual([0, 0, 1]);

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
    const connectRecord = session.getRecords().at(-1)!;
    expect(connectRecord).toMatchObject({
      kind: 'assemblyConnect',
      inputs: {
        a: { kind: 'feature', id: leafA.id },
        b: { kind: 'feature', id: leafB.id },
      },
      metadata: {
        assemblyName: 'hinge',
        connectName: 'pin-fixed',
        kind: 'fixed',
        a: { partName: 'leafA', connector: 'pin' },
        b: { partName: 'leafB', connector: 'pin' },
      },
    });
    const connectMeta = connectRecord.metadata as {
      a: { worldOrigin: unknown };
      b: { worldOrigin: unknown };
    };
    expect(evaluatedXYZ(connectMeta.a.worldOrigin)).toEqual([15, 0, 1.5]);
    expect(evaluatedXYZ(connectMeta.b.worldOrigin)).toEqual([15, 0, 1.5]);
  });

  it('captures mechanical joint intent contracts for review_cad', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const arm = kcad.assembly('intent arm');
    arm
      .part('base', kcad.box(40, 40, 4, true))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 2] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(30, 8, 6, true))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.part('servo', kcad.box(20, 12, 20, true));
    arm.part('shaft', kcad.cylinder(8, 2).alongAxis([0, 0, 1]));
    arm.part('support', kcad.box(12, 12, 8, true));
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute');

    const returned = arm.mechanicalJoint('yaw-drive', {
      mate: 'yaw',
      actuator: 'servo',
      shaft: 'shaft',
      supports: ['support'],
      output: 'link',
      requiredSupport: {
        kind: 'hinge-bracket',
        around: 'base.axis',
        supports: ['support'],
        minBearingLengthMm: 6,
      },
    });

    expect(returned).toBe(arm);
    expect(arm.__mechanicalJointIntents()).toEqual([
      {
        name: 'yaw-drive',
        mate: 'yaw',
        actuator: 'servo',
        shaft: 'shaft',
        supports: ['support'],
        output: 'link',
        requiredSupport: {
          kind: 'hinge-bracket',
          around: 'base.axis',
          supports: ['support'],
          minBearingLengthMm: 6,
        },
      },
    ]);
  });

  it('captures passive joint support intent records', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('passive support');

    const returned = arm.jointSupport('pip-bearing', {
      mate: 'index-pip',
      shaft: 'index-proximal',
      supports: ['index-proximal'],
      output: 'index-middle',
      requiredSupport: {
        kind: 'hinge-bracket',
        around: 'index-proximal.pip',
        supports: ['index-proximal'],
        minBearingLengthMm: 6,
      },
    });

    expect(returned).toBe(arm);
    expect(arm.__jointSupportIntents()).toEqual([
      {
        name: 'pip-bearing',
        mate: 'index-pip',
        shaft: 'index-proximal',
        supports: ['index-proximal'],
        output: 'index-middle',
        requiredSupport: {
          kind: 'hinge-bracket',
          around: 'index-proximal.pip',
          supports: ['index-proximal'],
          minBearingLengthMm: 6,
        },
      },
    ]);
  });

  it('stores contact target part roles', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('contact target');

    arm.part('grasp-cylinder', kcad.cylinder(20, 10), { role: 'contact-target' });

    expect(arm.__parts().find((part) => part.name === 'grasp-cylinder')?.role).toBe('contact-target');
  });

  it('rejects unknown part roles', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('bad role');

    expect(() => arm.part('mystery', kcad.box(1, 1, 1), {
      role: 'decorative' as never,
    })).toThrow(/assembly.part.invalid-role/);
  });

  it('rejects duplicate or empty mechanical joint intent fields', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('bad intent');

    arm.mechanicalJoint('drive', {
      mate: 'yaw',
      actuator: 'servo',
      shaft: 'shaft',
      supports: ['support'],
      output: 'link',
    });

    expect(() => arm.mechanicalJoint('drive', {
      mate: 'other',
      actuator: 'servo',
      shaft: 'shaft',
      supports: ['support'],
      output: 'link',
    })).toThrow(/assembly.mechanicalJoint.duplicate-name/);

    expect(() => arm.mechanicalJoint('empty-actuator', {
      mate: 'yaw',
      actuator: '',
      shaft: 'shaft',
      supports: ['support'],
      output: 'link',
    })).toThrow(/assembly.mechanicalJoint.invalid-ref/);

    expect(() => arm.mechanicalJoint('empty-support', {
      mate: 'yaw',
      actuator: 'servo',
      shaft: 'shaft',
      supports: ['support', ''],
      output: 'link',
    })).toThrow(/assembly.mechanicalJoint.invalid-ref/);
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
