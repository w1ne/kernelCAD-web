// tests/unit/kinematic/motionLoadSupportStation.test.ts
//
// Where a support bears on the shaft. DRAW 01 v7.1 named whole multi-feature
// bodies ('console', 'inner-link') as the second support of a servo joint;
// the study put each at the body's centroid projected on the axis, which
// gave the elbow bushing 8.15 N instead of ~2.4 N with no warning.
//
// Fixture: a vertical joint (axis +Z through the origin). The servo
// (actuator) holds the joint at z = 0. The moving arm is a rod (r 1.5,
// z 0..20) plus a horizontal beam, so gravity bends the shaft about the
// joint. The support 'frame' is ONE part: a heavy base plate on the axis far
// below the joint, a post, a bridge and a ring around the rod at
// z 12..16. Its centroid is near the base plate; its contact with the rod
// is the ring, station 14 mm. With two simple supports and an axial
// weight, each support reacts R = M_bend / s.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/composition/runScript';
import { checkMotionLoad } from '../../../src/kinematic/motionLoad';
import type { Assembly } from '../../../src/modeling/capture/assembly';

/** `rings`: [zFrom, zTo] of each ring around the rod. `connector`: an extra
 *  frame connector on the axis at that z. `ringR`: ring bore radius. */
function script(opts: { rings?: Array<[number, number]>; connector?: number; ringR?: number } = {}): string {
  const rings = opts.rings ?? [[12, 16]];
  const ringR = opts.ringR ?? 1.6;
  const ringCode = rings
    .map(([z0, z1]) => `.union(cylinder(${z1 - z0}, 3.5, 32).subtract(cylinder(${z1 - z0 + 2}, ${ringR}, 32).translate(0, 0, -1)).translate(0, 0, ${z0}))` +
      `.union(box(28, 4, ${z1 - z0}).translate(-30, -2, ${z0}))`)
    .join('');
  return `
const a = param('a', 0, { min: -30, max: 30 });
const arm = assembly('support-station');
const servo = arm.part('servo', box(20, 12, 20).translate(-10, -6, -20), { density: 1000 });
const beam = cylinder(20, 1.5, 32).union(box(100, 6, 3).translate(0, -3, 0));
const shaft = arm.part('arm', beam, { density: 7850 });
const frame = arm.part('frame', box(120, 120, 10).translate(-60, -60, -60)
  .union(box(4, 4, 60).translate(-32, -2, -50))${ringCode}, { density: 1000 });
const d = { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] };
servo.connector('j-out', d);
shaft.connector('j-in', d);
const seat = { type: 'frame', origin: { kind: 'vec3', value: [-10, 0, -20] }, normal: [0, 0, 1] };
servo.connector('to-frame', seat);
frame.connector('servo-seat', seat);
${opts.connector !== undefined ? `frame.connector('bearing', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, ${opts.connector}] }, normal: [0, 0, 1] });` : ''}
arm.mate('frame-servo', 'frame.servo-seat', 'servo.to-frame', 'fastened');
arm.mate('j', 'servo.j-out', 'arm.j-in', 'revolute', { pose: a, limitsDeg: [-30, 30] });
arm.mechanicalJoint('j-drive', { mate: 'j', actuator: 'servo', shaft: 'arm', supports: ['servo', 'frame'], output: 'arm', torqueNm: 0.2 });
arm.physicalUseCase('bench', { stableParts: ['frame'] });
return arm.solvedModel({});
`;
}

async function load(code: string): Promise<Assembly> {
  const run = await runScript({ code, fileName: 'support-station.kcad.ts' });
  if (run.session.assemblies.size === 0) throw new Error(JSON.stringify(run.diagnostics ?? run));
  return [...run.session.assemblies.values()][0] as Assembly;
}

describe('motion-load support station', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('places a multi-feature support body at its contact with the shaft, not its centroid', async () => {
    const r = await checkMotionLoad(await load(script()), { mode: 'range', rangeSamples: 3 });
    const j = r.joints[0]!;
    const frame = j.supportLoads?.find((s) => s.part === 'frame');
    expect(frame).toBeDefined();
    // Ring z 12..16: the frame bears at 14 mm, from its material near the axis.
    expect(frame!.stationMm).toBeCloseTo(14, 1);
    expect(frame!.stationFrom).toBe('contact');
    // The weight is axial, so the two simple supports react the bending
    // moment as a couple: R = M / s at both.
    expect(j.peakBendingNmm).toBeGreaterThan(1);
    expect(frame!.peakRadialN).toBeCloseTo(j.peakBendingNmm / 14, 3);
    const servo = j.supportLoads!.find((s) => s.part === 'servo')!;
    expect(servo.stationFrom).toBe('actuator');
    expect(servo.peakRadialN).toBeCloseTo(j.peakBendingNmm / 14, 3);
    expect(r.diagnostics.filter((d) => d.code === 'mechanism.load.not-resolved')).toEqual([]);
  }, 180_000);

  it('uses the support connector on the joint axis when it has one', async () => {
    const r = await checkMotionLoad(await load(script({ connector: 20 })), { mode: 'range', rangeSamples: 3 });
    const frame = r.joints[0]!.supportLoads!.find((s) => s.part === 'frame')!;
    expect(frame.stationFrom).toBe('connector');
    expect(frame.stationMm).toBeCloseTo(20, 6);
    expect(frame.peakRadialN).toBeCloseTo(r.joints[0]!.peakBendingNmm / 20, 3);
  }, 180_000);

  it('NEGATIVE CONTROL: two rings at different stations is ambiguous: a warning naming the support, no number', async () => {
    const r = await checkMotionLoad(await load(script({ rings: [[2, 5], [14, 17]] })), { mode: 'range', rangeSamples: 3 });
    const j = r.joints[0]!;
    expect(j.supportLoads).toBeUndefined();
    const warn = r.diagnostics.filter((d) => d.code === 'mechanism.load.not-resolved');
    expect(warn).toHaveLength(1);
    expect(warn[0]!.severity).toBe('warn');
    expect(warn[0]!.message).toContain("support 'frame'");
    expect(warn[0]!.message).toContain('ambiguous');
    expect(j.maxLevel).toBe('warning');
    expect(j.messages.some((m) => m.includes("'frame'") && m.includes('not reported'))).toBe(true);
  }, 180_000);

  it('NEGATIVE CONTROL: a support with no material along the shaft is a warning, not a number', async () => {
    // Ring far below the rod (z -12..-8): the frame never touches the shaft.
    const r = await checkMotionLoad(await load(script({ rings: [[-12, -8]] })), { mode: 'range', rangeSamples: 3 });
    const j = r.joints[0]!;
    expect(j.supportLoads).toBeUndefined();
    const warn = r.diagnostics.filter((d) => d.code === 'mechanism.load.not-resolved');
    expect(warn.map((d) => d.message).join('\n')).toContain("support 'frame' — has no material near the joint axis (within 10 mm) along the shaft");
  }, 180_000);
});
