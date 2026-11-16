// tests/unit/kinematic/motionLoadRangeCoupled.test.ts
//
// Range-mode motion load on a coupled drive. A pinion mate 'motor' drives
// the pendulum mate 'hinge' through coupleMates (ratio 0.5). The hinge is a
// dependent coordinate: the range study must sample the motor and derive the
// hinge, never grid the two mates independently (an unreachable pose).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/composition/runScript';
import { checkMotionLoad } from '../../../src/kinematic/motionLoad';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const L = 0.3, W = 0.02, H = 0.01, RHO = 7850, G = 9.81;
const M = RHO * L * W * H;

function script(opts: { motorLimits?: string; motorDrive?: boolean }): string {
  const motorLimits = opts.motorLimits === undefined ? '' : `, limitsDeg: ${opts.motorLimits}`;
  const motorDrive = opts.motorDrive === false
    ? ''
    : "arm.mechanicalJoint('motor-drive', { mate: 'motor', actuator: 'wall', shaft: 'pinion', supports: ['wall'], output: 'pinion', torqueNm: 5 });";
  return `
const arm = assembly('geared-pendulum');
const wall = arm.part('wall', box(40, 40, 40, true).translate(-20, 0, 0), { density: 1000 });
const bar = arm.part('bar', box(300, 20, 10, true).translate(150, 0, 0), { density: ${RHO} });
const pinion = arm.part('pinion', cylinder(10, 5).translate(-20, 0, 40), { density: 1000 });
const hingeAxis = { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] };
const motorAxis = { type: 'axis', origin: { kind: 'vec3', value: [-20, 0, 40] }, axis: [0, 0, 1] };
wall.connector('hinge-out', hingeAxis);
bar.connector('hinge-in', hingeAxis);
wall.connector('motor-out', motorAxis);
pinion.connector('motor-in', motorAxis);
arm.mate('hinge', 'wall.hinge-out', 'bar.hinge-in', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('motor', 'wall.motor-out', 'pinion.motor-in', 'revolute', { pose: 0${motorLimits} });
arm.coupleMates('hinge', { source: 'motor', ratio: 0.5 });
arm.mechanicalJoint('hinge-drive', { mate: 'hinge', actuator: 'wall', shaft: 'bar', supports: ['wall'], output: 'bar', torqueNm: 2 });
${motorDrive}
return arm.solvedModel({});
`;
}

async function load(code: string): Promise<Assembly> {
  const run = await runScript({ code, fileName: 'geared-pendulum.kcad.ts' });
  if (run.session.assemblies.size === 0) throw new Error(JSON.stringify(run.diagnostics ?? run));
  return [...run.session.assemblies.values()][0] as Assembly;
}

function hingeSeries(r: Awaited<ReturnType<typeof checkMotionLoad>>) {
  const hinge = r.joints.find((j) => j.mate === 'hinge');
  expect(hinge).toBeDefined();
  return hinge!.series;
}

describe('checkMotionLoad range mode — coupled driven mate', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('samples the source mate and derives the driven mate, never an unreachable pair', async () => {
    const r = await checkMotionLoad(await load(script({ motorLimits: '[-180, 180]' })), { mode: 'range', rangeSamples: 5 });
    expect(r.samples).toBe(5);
    const series = hingeSeries(r);
    expect(series.map((s) => s.pose['motor'])).toEqual([-180, -90, 0, 90, 180]);
    for (const s of series) {
      expect(s.pose['hinge']).toBeCloseTo(0.5 * (s.pose['motor'] as number), 9);
      const theta = (s.pose['hinge'] as number) * Math.PI / 180;
      expect(Math.abs(s.torqueNm)).toBeCloseTo(M * G * (L / 2) * Math.cos(theta), 4);
    }
  }, 120_000);

  it('a rated driven mate alone still moves through its source', async () => {
    const r = await checkMotionLoad(
      await load(script({ motorLimits: '[-180, 180]', motorDrive: false })),
      { mode: 'range', rangeSamples: 3 },
    );
    const series = hingeSeries(r);
    expect(series.map((s) => s.pose['motor'])).toEqual([-180, 0, 180]);
    expect(series.map((s) => s.pose['hinge'])).toEqual([-90, 0, 90]);
  }, 120_000);

  it('cuts a wider source range to the driven limits mapped back through the ratio', async () => {
    // Motor ±360 at ratio 0.5 would put the hinge at ±180, past its [-90, 90].
    const r = await checkMotionLoad(
      await load(script({ motorLimits: '[-360, 360]' })),
      { mode: 'range', rangeSamples: 3 },
    );
    const series = hingeSeries(r);
    expect(series.map((s) => s.pose['motor'])).toEqual([-180, 0, 180]);
    expect(series.map((s) => s.pose['hinge'])).toEqual([-90, 0, 90]);
  }, 120_000);

  it('an unlimited source is sampled over the driven limits mapped back through the ratio', async () => {
    const r = await checkMotionLoad(
      await load(script({ motorDrive: false })),
      { mode: 'range', rangeSamples: 3 },
    );
    const series = hingeSeries(r);
    expect(series.map((s) => s.pose['motor'])).toEqual([-180, 0, 180]);
    expect(series.map((s) => s.pose['hinge'])).toEqual([-90, 0, 90]);
  }, 120_000);
});
