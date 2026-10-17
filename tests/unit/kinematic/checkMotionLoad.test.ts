// tests/unit/kinematic/checkMotionLoad.test.ts
//
// Motion-load study against hand calculations.
//
// Fixture: a steel bar 300 x 20 x 10 mm (x, y, z) on a revolute mate about
// world +Y at the origin, driven by a mechanicalJoint. Bar spans x in [0, 300].
//   m      = 7850 * 300*20*10e-9 = 0.471 kg
//   static tau(θ) = m g (L/2) cos θ   (θ = mate rotation about +Y)
//   I_O,y  = m (L² + H²)/12 + m (L/2)² = 0.471*(0.09+0.0001)/12 + 0.471*0.0225
//   easeIn ramp θ = Δ u³, u = t/T: α(t) = 6 Δ t / T³ (rad/s²), so with
//   gravity off tau(t) = I_O,y α(t).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/composition/runScript';
import { checkMotionLoad } from '../../../src/kinematic/motionLoad';
import { splitJointLoad, subtreeJointWrench } from '../../../src/kinematic/rigidBodyLoads';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const L = 0.3, W = 0.02, H = 0.01, RHO = 7850, G = 9.81;
const M = RHO * L * W * H;
const I_O = (M * (L * L + H * H)) / 12 + M * (L / 2) ** 2;

function script(opts: { torqueNm?: string; ease?: string; durationMs?: number; deltaDeg?: number; extra?: string; supports?: string } = {}): string {
  const dur = opts.durationMs ?? 1000;
  const delta = opts.deltaDeg ?? 60;
  return `
const a = param('a', 0, { min: -90, max: 90 });
const arm = assembly('pendulum');
const wall = arm.part('wall', box(40, 40, 40, true).translate(-20, 0, 0), { density: 1000 });
const bar = arm.part('bar', box(300, 20, 10, true).translate(150, 0, 0), { density: ${RHO} });
${opts.extra ?? ''}
const d = { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] };
wall.connector('hinge-out', d);
bar.connector('hinge-in', d);
arm.mate('hinge', 'wall.hinge-out', 'bar.hinge-in', 'revolute', { pose: a, limitsDeg: [-90, 90] });
arm.mechanicalJoint('hinge-drive', { mate: 'hinge', actuator: 'wall', shaft: 'bar', supports: ${opts.supports ?? "['wall']"}, output: 'bar'${opts.torqueNm ? `, torqueNm: ${opts.torqueNm}` : ''} });
animationView({ tracks: [{ param: 'a', keys: [{ atMs: 0, value: 0 }, { atMs: ${dur}, value: ${delta}, ease: '${opts.ease ?? 'linear'}' }] }] });
return arm.solvedModel({});
`;
}

async function load(code: string): Promise<Assembly> {
  const run = await runScript({ code, fileName: 'pendulum.kcad.ts' });
  if (run.session.assemblies.size === 0) throw new Error(JSON.stringify(run.diagnostics ?? run));
  return [...run.session.assemblies.values()][0] as Assembly;
}

describe('checkMotionLoad — hand-calculated pendulum', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('quasi-static gravity torque follows m g L/2 cos θ along the track', async () => {
    const arm = await load(script({ torqueNm: '2' }));
    const r = await checkMotionLoad(arm, { quasiStatic: true, sampleMs: 50 });
    expect(r.joints).toHaveLength(1);
    const j = r.joints[0];
    expect(j.downstreamParts).toEqual(['bar']);
    expect(j.downstreamMassKg).toBeCloseTo(M, 4);
    for (const s of j.series) {
      const theta = (s.pose['hinge'] as number) * Math.PI / 180;
      expect(Math.abs(s.torqueNm)).toBeCloseTo(M * G * (L / 2) * Math.cos(theta), 4);
      // Single support: radial = weight component normal to Y = m g, axial 0.
      expect(s.radialN).toBeCloseTo(M * G, 4);
      expect(s.axialN).toBeCloseTo(0, 6);
    }
    expect(j.peakTorqueNm).toBeCloseTo(M * G * L / 2, 4);
    expect(j.torqueMargin).toBeCloseTo(2 / (M * G * L / 2), 3);
    expect(j.maxLevel).toBe('ok');
  }, 120_000);

  it('inverse dynamics: easeIn ramp with gravity off gives tau = I_O α', async () => {
    const arm = await load(script({ ease: 'easeIn', durationMs: 1000, deltaDeg: 60 }));
    const r = await checkMotionLoad(arm, { gravity: [0, 0, 0], sampleMs: 10 });
    const j = r.joints[0];
    const delta = 60 * Math.PI / 180;
    const T = 1;
    for (const s of j.series) {
      const t = s.tMs! / 1000;
      if (t < 0.1 || t > 0.9) continue;
      const alpha = (6 * delta * t) / T ** 3;
      expect(Math.abs(s.torqueNm)).toBeCloseTo(I_O * alpha, 3);
    }
  }, 120_000);

  it('negative control: zero load gives zero torque; an under-rated actuator is an error', async () => {
    const zero = await checkMotionLoad(await load(script({ torqueNm: '1' })), { gravity: [0, 0, 0], quasiStatic: true });
    expect(zero.joints[0].peakTorqueNm).toBeCloseTo(0, 9);
    expect(zero.joints[0].peakRadialN).toBeCloseTo(0, 9);

    const weak = await checkMotionLoad(await load(script({ torqueNm: String((M * G * L / 2) * 0.5) })), { quasiStatic: true });
    expect(weak.maxLevel).toBe('error');
    expect(weak.ok).toBe(false);
    expect(weak.diagnostics.map((d) => d.code)).toContain('mechanism.load.torque-exceeded');

    const marginal = await checkMotionLoad(await load(script({ torqueNm: String((M * G * L / 2) * 1.5) })), { quasiStatic: true });
    expect(marginal.maxLevel).toBe('warning');
    expect(marginal.diagnostics.map((d) => d.code)).toContain('mechanism.load.torque-margin-low');
  }, 120_000);

  it('no rating: loads are reported, not checked, never a silent pass', async () => {
    const r = await checkMotionLoad(await load(script()), { quasiStatic: true });
    const j = r.joints[0];
    expect(j.torqueMargin).toBeUndefined();
    expect(j.messages.join(' ')).toMatch(/no torqueNm rating, torque not checked/);
    expect(j.messages.join(' ')).toMatch(/radial load .* no rating, not checked/);
  }, 120_000);

  it('external load: a tip force adds F·L to the torque', async () => {
    const r = await checkMotionLoad(await load(script({ deltaDeg: 0.001 })), {
      quasiStatic: true, gravity: [0, 0, 0],
      loads: [{ part: 'bar', point: [300, 0, 0], force: [0, 0, 2] }],
    });
    expect(r.joints[0].peakTorqueNm).toBeCloseTo(2 * L, 4);
  }, 120_000);

  it('range mode samples the joint limits quasi-statically', async () => {
    const r = await checkMotionLoad(await load(script({ torqueNm: '1' })), { mode: 'range', rangeSamples: 5 });
    expect(r.samples).toBe(5);
    expect(r.joints[0].series.map((s) => s.pose['hinge'])).toEqual([-90, -45, 0, 45, 90]);
    expect(r.joints[0].worst.pose['hinge']).toBe(0);
  }, 120_000);
});

describe("verify({ check: 'motion-load' })", () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('routes to the study, thins the series and keeps the worst sample', async () => {
    const r = await verifyTool({ check: 'motion-load', code: script({ torqueNm: '2' }), quasi_static: true, sample_ms: 5, series_points: 10 }) as {
      ok: boolean; statement: string; joints: Array<{ series: unknown[]; worst: unknown; peakTorqueNm: number }>;
    };
    expect(r.ok, JSON.stringify(r).slice(0, 600)).toBe(true);
    expect(r.statement).toMatch(/^Loads checked: min torque margin \d/);
    const j = r.joints[0];
    expect(j.series.length).toBeLessThanOrEqual(13);
    expect(j.series).toContain(j.worst);
    expect(j.peakTorqueNm).toBeCloseTo(M * G * L / 2, 4);
  }, 120_000);
});

describe('evaluate_script mechanism verdict', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('adds a short loads line only when a joint declares torqueNm', async () => {
    const rated = await evaluateScriptTool({ code: script({ torqueNm: '2' }) });
    const summary = rated.mechanismSummary!;
    expect(summary.loads?.statement).toMatch(/^loads: min torque margin \d/);
    expect(summary.statement).toContain(summary.loads!.statement);
    expect(summary.loads?.joints?.[0].torque.length).toBeGreaterThan(2);

    const unrated = await evaluateScriptTool({ code: script() });
    expect(unrated.mechanismSummary?.loads).toBeUndefined();
  }, 240_000);
});

describe('splitJointLoad — coaxial supports', () => {
  it('two supports react the bending moment as a couple', () => {
    // 1 N radial (+X) applied 10 mm above the origin on a Z axis -> at origin:
    // F = (1,0,0), M = r x F = (0,0,0.01) x (1,0,0) = (0, 0.01, 0).
    const w = { forceN: [1, 0, 0] as const, momentNm: [0, 0.01, 0] as const };
    const one = splitJointLoad(w, [0, 0, 1], [{ name: 'servo', stationM: 0 }]);
    expect(one.supports![0].radialN).toBeCloseTo(1, 9);
    expect(one.supports![0].bendingNm).toBeCloseTo(0.01, 9);
    // Supports at z=0 and z=20 mm: load at 10 mm splits 0.5 / 0.5.
    const two = splitJointLoad(w, [0, 0, 1], [{ name: 'servo', stationM: 0 }, { name: 'bush', stationM: 0.02 }]);
    expect(two.supports![0].radialN).toBeCloseTo(0.5, 9);
    expect(two.supports![1].radialN).toBeCloseTo(0.5, 9);
    // Supports at 0 and 5 mm: overhung load, the far one carries 2 N, the servo 1 N back.
    const over = splitJointLoad(w, [0, 0, 1], [{ name: 'servo', stationM: 0 }, { name: 'bush', stationM: 0.005 }]);
    expect(over.supports![1].radialN).toBeCloseTo(2, 9);
    expect(over.supports![0].radialN).toBeCloseTo(1, 9);
    expect(splitJointLoad(w, [0, 0, 1], [{ name: 'a', stationM: 0 }, { name: 'b', stationM: 0.01 }, { name: 'c', stationM: 0.02 }]).supports).toBeUndefined();
  });

  it('subtree wrench: static point mass', () => {
    const w = subtreeJointWrench([{ massKg: 1, comM: [0.1, 0, 0] }], [0, 0, 0], [0, 0, -10]);
    expect(w.forceN).toEqual([0, 0, 10]);
    expect(w.momentNm[1]).toBeCloseTo(-1, 12);
  });
});
