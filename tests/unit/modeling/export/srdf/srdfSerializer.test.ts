import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { srdfSerialize } from '../../../../../src/modeling/export/srdf/srdfSerializer';
import { CaptureSession } from '../../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../../src/modeling/api';

describe('srdfSerialize — Task B4.C', () => {
  beforeAll(async () => { await initOcct(); });

  function makeArm() {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('two-link');
    const base = arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const upper = arm.part('upper', kcad.box(80, 10, 10), { density: 2700 });
    arm.revolute('shoulder', base, upper, { axis: [0, 0, 1], origin: [0, 0, 10], limitsDeg: [-90, 90] });
    arm.planningGroup('main', { chain: { baseLink: 'base', tipLink: 'upper' } });
    return arm;
  }

  it('emits <robot name>, <group chain>, and at least one <disable_collisions>', async () => {
    const arm = makeArm();
    const r = await srdfSerialize(arm, {});
    expect(r.srdf).toMatch(/<robot name="two-link">/);
    expect(r.srdf).toMatch(/<group name="main">/);
    expect(r.srdf).toMatch(/<chain base_link="base" tip_link="upper"\s*\/>/);
    expect(r.srdf).toMatch(/<disable_collisions/);
  });

  it('refuses export with planning-group-missing when no group declared', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('a');
    arm.part('base', kcad.box(10, 10, 10), { density: 2700 });
    const r = await srdfSerialize(arm, {});
    expect(r.srdf).toBe('');
    expect(r.diagnostics.map(d => d.code)).toContain('export.srdf.planning-group-missing');
  });

  it('emits end-effector entries when arm.endEffector is declared', async () => {
    const arm = makeArm();
    arm.endEffector('tool', { parentLink: 'upper', group: 'gripper', parentGroup: 'main' });
    const r = await srdfSerialize(arm, {});
    expect(r.srdf).toMatch(/<end_effector name="tool" parent_link="upper"/);
  });
});
