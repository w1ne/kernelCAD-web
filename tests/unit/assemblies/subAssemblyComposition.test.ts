// tests/unit/assemblies/subAssemblyComposition.test.ts
//
// Slice 1 of sub-assembly composition: flattening import. Surfaced by
// Exp-E nested-sub-assembly — every competing CAD package (Fusion /
// Onshape / ForgeCAD / SolidWorks) treats sub-assemblies as first-class,
// kernelCAD had no composition API at all. Slice 1: `arm.subAssembly(name,
// other)` copies parts + mates with `${name}_` prefix.

import { describe, expect, it, beforeAll } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('Assembly.subAssembly', () => {
  beforeAll(async () => { await initOcct(); });

  function makeKcad() {
    const session = new CaptureSession();
    return { kcad: createApi({ session }), session };
  }

  it('imports the other assembly\'s parts with the prefix', () => {
    const { kcad } = makeKcad();
    const gripper = kcad.assembly('gripper');
    gripper.part('wrist', kcad.box(10, 10, 10));
    gripper.part('left', kcad.box(5, 5, 5));

    const robot = kcad.assembly('robot');
    robot.part('arm', kcad.box(20, 10, 10));
    const sub = robot.subAssembly('grip', gripper);

    expect(sub.prefix).toBe('grip_');
    expect(sub.part('wrist').name).toBe('grip_wrist');
    expect(sub.part('left').name).toBe('grip_left');
    expect(() => sub.part('nope')).toThrow(/not a part of the imported/i);
  });

  it('imports the other assembly\'s mates with refs remapped', async () => {
    const { kcad } = makeKcad();
    const gripper = kcad.assembly('gripper');
    gripper.part('wrist', kcad.box(10, 10, 10))
      .connector('out', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
    gripper.part('left', kcad.box(5, 5, 5))
      .connector('in', { type: 'frame', origin: { kind: 'vec3', value: [-2.5, 0, 0] } });
    gripper.mate('claw', 'wrist.out', 'left.in', 'fastened');

    const robot = kcad.assembly('robot');
    robot.part('arm', kcad.box(20, 10, 10));
    robot.subAssembly('grip', gripper);

    // Inspect via the friend accessor — mate name + refs prefixed.
    const mates = robot.__mates();
    expect(mates.length).toBe(1);
    expect(mates[0].name).toBe('grip_claw');
    expect(mates[0].a).toBe('grip_wrist.out');
    expect(mates[0].b).toBe('grip_left.in');
    // The whole thing should evaluate cleanly through buildModel.
    const ev = await buildModel({
      fileName: 'inline.kcad.ts',
      code: 'return null;',
    });
    expect(ev).toBeDefined();
  });

  it('lets the outer assembly mate into the imported sub via .ref(part, conn)', async () => {
    const model = await buildModel({
      fileName: 'sub-with-outer-mate.kcad.ts',
      code: `
        const gripper = assembly('gripper');
        gripper.part('wrist', box(10, 10, 10))
          .connector('in', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });

        const robot = assembly('robot');
        robot.part('arm', box(20, 10, 10))
          .connector('out', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
        const sub = robot.subAssembly('grip', gripper);
        robot.mate('attach', 'arm.out', sub.ref('wrist', 'in'), 'fastened');
        return robot.solvedModel({});
      `,
    });
    const errs = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errs).toEqual([]);
  });

  it('rejects importing an assembly into itself', () => {
    const { kcad } = makeKcad();
    const arm = kcad.assembly('arm');
    arm.part('a', kcad.box(5, 5, 5));
    expect(() => arm.subAssembly('self', arm)).toThrow(/cannot import an assembly into itself/);
  });

  it('rejects subAssembly names containing dot or underscore', () => {
    const { kcad } = makeKcad();
    const other = kcad.assembly('other');
    other.part('p', kcad.box(5, 5, 5));
    const arm = kcad.assembly('arm');
    expect(() => arm.subAssembly('foo.bar', other)).toThrow(/'\.'/);
    expect(() => arm.subAssembly('foo_bar', other)).toThrow(/'_'/);
    expect(() => arm.subAssembly('', other)).toThrow();
  });
});
