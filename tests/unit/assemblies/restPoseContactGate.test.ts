// tests/unit/assemblies/restPoseContactGate.test.ts
//
// Rest-pose contact gate (criterion 9). An assembly whose solids pass
// through each other as drawn, or whose mated parts never touch, must be
// 'broken' even when the articulated pose sweep is skipped for budget.
// Seated contact (coincident faces, a pin in a clearance bore) must pass.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { Transform } from '../../../src/shared/runtime/se3';
import { meshOverlapVolume, worldMesh } from '../../../src/modeling/runtime/restPoseContact';

function kcadApi() {
  return createModelingApi({ session: new CaptureSession() });
}

const codes = (r: { failures: { code: string }[] }) => r.failures.map((d) => d.code);

describe('rest-pose contact gate', () => {
  it('integrates the shared volume of two overlapping solids', async () => {
    await initOcct();
    const a = worldMesh(OcctBackend.box(20, 20, 20), Transform.identity())!;
    const b = worldMesh(OcctBackend.box(20, 20, 20), Transform.translation(15, 10, 5))!;
    // Exact common volume: 5 × 10 × 15 = 750 mm³.
    const r = meshOverlapVolume(a, b);
    expect(r.volumeMm3).toBeGreaterThan(700);
    expect(r.volumeMm3).toBeLessThan(800);
    const touching = worldMesh(OcctBackend.box(20, 20, 20), Transform.translation(20, 0, 0))!;
    expect(meshOverlapVolume(a, touching).volumeMm3).toBe(0);
  });

  it('passes a wide contact sliver thinner than 0.3 mm, fails a 0.6 mm one', async () => {
    for (const [sink, broken] of [[0.2, false], [0.6, true]] as const) {
      const kcad = kcadApi();
      const arm = kcad.assembly(`sliver-${sink}`);
      // 60 × 60 mm plates: 0.2 mm sink = 720 mm³ of skin, far over the
      // volume cap, but only a contact sliver.
      arm.part('lower', kcad.box(60, 60, 5))
        .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
      arm.part('upper', kcad.box(60, 60, 5).translate(0, 0, 5 - sink))
        .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
      arm.mate('fix', 'lower.m', 'upper.m', 'fastened');
      const r = await checkMechanismTruth(arm, { sweepBudget: 0 });
      expect(codes(r).includes('mechanism.rest-interpenetration')).toBe(broken);
    }
  });

  it('fails a mated link that passes through its parent, naming the pair, with the sweep skipped', async () => {
    const kcad = kcadApi();
    const arm = kcad.assembly('colliding-elbow');
    arm.part('upper', kcad.box(40, 20, 20))
      .connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [30, 10, 10] }, axis: [0, 1, 0] });
    // The forearm starts 10 mm inside the upper link: 10 × 20 × 20 = 4000 mm³.
    arm.part('forearm', kcad.box(40, 20, 20))
      .connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [0, 10, 10] }, axis: [0, 1, 0] });
    arm.mate('elbow', 'upper.elbow', 'forearm.elbow', 'revolute', { pose: 0, limitsDeg: [-30, 30] });
    const r = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(r.mechanism).toBe('broken');
    const hit = r.failures.find((d) => d.code === 'mechanism.rest-interpenetration');
    expect(hit?.severity).toBe('error');
    expect(hit?.message).toContain("'upper' and 'forearm'");
    const vol = Number(/by ([\d.]+) mm³/.exec(hit!.message)![1]);
    expect(vol).toBeGreaterThan(3600);
    expect(vol).toBeLessThan(4400);
  });

  it('ignores solvedModel({ ignore }) at rest', async () => {
    const kcad = kcadApi();
    const arm = kcad.assembly('ignored-overlap');
    arm.part('a', kcad.box(30, 30, 10))
      .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.part('b', kcad.box(30, 30, 10).translate(10, 10, 5))
      .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('fix', 'a.m', 'b.m', 'fastened');
    await arm.solvedModel({}, { ignore: [['a', 'b']], validate: 'off' });
    expect(arm.__ignoreInterference()).toHaveLength(1);
    const r = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(codes(r)).toContain('mechanism.rest-interpenetration');
  });

  it('fails a mate whose parts do not touch, naming the pair and gap', async () => {
    const kcad = kcadApi();
    const arm = kcad.assembly('floating-bracket');
    arm.part('plate', kcad.box(40, 40, 5))
      .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    // 7 mm of air between the plate top (z = 5) and the bracket (z = 12).
    arm.part('bracket', kcad.box(20, 20, 5).translate(10, 10, 12))
      .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    arm.mate('bolt', 'plate.m', 'bracket.m', 'fastened');
    const r = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(r.mechanism).toBe('broken');
    const gap = r.failures.find((d) => d.code === 'mechanism.mate-gap');
    expect(gap?.message).toContain("'plate' and 'bracket'");
    expect(gap?.message).toMatch(/7\.00 mm apart/);
  });

  it('passes coincident faces and a pin in a clearance bore', async () => {
    const kcad = kcadApi();
    const arm = kcad.assembly('seated');
    // Fork with a 5.2 mm bore; 5 mm pin through it; a block resting on top.
    const fork = kcad.box(30, 20, 20).subtract(kcad.cylinder(40, 2.6).rotate([1, 0, 0], 90).translate(15, 30, 10));
    arm.part('fork', fork)
      .connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [15, 10, 10] }, axis: [0, 1, 0] })
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [15, 10, 20] } });
    arm.part('pin', kcad.cylinder(30, 2.5).rotate([1, 0, 0], 90).translate(15, 25, 10))
      .connector('pin', { type: 'axis', origin: { kind: 'vec3', value: [15, 10, 10] }, axis: [0, 1, 0] });
    arm.part('cap', kcad.box(30, 20, 5).translate(0, 0, 20))
      .connector('top', { type: 'frame', origin: { kind: 'vec3', value: [15, 10, 20] } });
    arm.mate('pivot', 'fork.pin', 'pin.pin', 'revolute', { pose: 0, limitsDeg: [-90, 90] });
    arm.mate('cap', 'fork.top', 'cap.top', 'fastened');
    const r = await checkMechanismTruth(arm, { sweepBudget: 0 });
    expect(codes(r)).not.toContain('mechanism.rest-interpenetration');
    expect(codes(r)).not.toContain('mechanism.mate-gap');
  });
});
