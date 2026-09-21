// tests/unit/kinematic/checkStaticHold.test.ts
//
// Static-hold gravitational torque check.
//
// Fixture: a single horizontal beam (width 20 mm x height 10 mm x length
// 300 mm along +X) hinged at its root to a fixed wall via a revolute joint
// (axis [0,1,0] — Y), starting horizontal at pose 0 deg.
//
// Hand calc: mass m = density * volume, volume = 300*20*10 mm^3 = 6e-5 m^3.
// steel density 7850 kg/m^3 -> m = 0.4710 kg.
// At pose 0 (horizontal), moment arm about the hinge = L/2 = 0.15 m
// (box() is centered then translated so it spans x in [0, L]).
// tau = m * g * L/2 = 0.4710 * 9.81 * 0.15 = 0.6931 N*m.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkStaticHold } from '../../../src/kinematic/checkStaticHold';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createScriptApi } from '../../../src/composition/scriptApi';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const LENGTH_MM = 300;
const WIDTH_MM = 20;
const HEIGHT_MM = 10;
const STEEL_DENSITY = 7850;
const G = 9.81;

function buildHingedBeam(opts: {
  torqueNm?: number;
  density?: number;
  limitsDeg?: [number, number];
} = {}): { arm: Assembly } {
  const session = new CaptureSession();
  const kc = createScriptApi({ session });
  const arm = kc.assembly('hinged-beam');
  const wall = arm.part('wall', kc.box(40, 40, 40, true));
  const beam = arm.part(
    'beam',
    kc.box(LENGTH_MM, WIDTH_MM, HEIGHT_MM, true).translate(LENGTH_MM / 2, 0, 0),
    { density: opts.density ?? STEEL_DENSITY },
  );
  arm.revolute('shoulder', wall, beam, {
    axis: [0, 1, 0],
    origin: [0, 0, 0],
    limitsDeg: opts.limitsDeg ?? [-90, 90],
    ...(opts.torqueNm !== undefined ? { actuator: { torqueNm: opts.torqueNm } } : {}),
  });
  return { arm };
}

function expectedTorqueAtHorizontal(density: number): number {
  const volumeM3 = (LENGTH_MM * WIDTH_MM * HEIGHT_MM) * 1e-9;
  const massKg = density * volumeM3;
  return massKg * G * (LENGTH_MM / 2) * 1e-3;
}

describe('checkStaticHold — gravitational torque vs actuator capacity', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('analytic torque on a horizontal beam: tau = m*g*L/2', async () => {
    const expected = expectedTorqueAtHorizontal(STEEL_DENSITY);
    const { arm } = buildHingedBeam({ torqueNm: expected * 10 });
    const r = await checkStaticHold(arm, { pose: { shoulder: 0 } });
    expect(r.source).toBe('local');
    expect(r.joints).toHaveLength(1);
    const j = r.joints[0]!;
    expect(j.jointName).toBe('shoulder');
    expect(j.kind).toBe('revolute');
    expect(j.worstRequired).toBeCloseTo(expected, 3);
  });

  it('worst-pose detection: horizontal (0 deg) is worse than near-vertical', async () => {
    const expected = expectedTorqueAtHorizontal(STEEL_DENSITY);
    const { arm } = buildHingedBeam({ torqueNm: expected * 10, limitsDeg: [-90, 90] });
    const r = await checkStaticHold(arm, { rangeSamples: 19 });
    const j = r.joints[0]!;
    // Grid includes 0 exactly (19 samples over [-90,90] step 10).
    expect(j.worstPose['shoulder']).toBeCloseTo(0, 5);
    expect(j.worstRequired).toBeCloseTo(expected, 2);
  });

  it('actuator capacity exceeded fires assembly.joint.static-hold.exceeded, ok=false', async () => {
    const expected = expectedTorqueAtHorizontal(STEEL_DENSITY);
    const { arm } = buildHingedBeam({ torqueNm: expected * 0.5 });
    const r = await checkStaticHold(arm, { pose: { shoulder: 0 } });
    expect(r.ok).toBe(false);
    const diag = r.diagnostics.find((d) => d.code === 'assembly.joint.static-hold.exceeded');
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('error');
    expect(diag!.element).toBe('shoulder');
  });

  it('margin below floor (but capacity sufficient) fires margin-low warn, ok=true', async () => {
    const expected = expectedTorqueAtHorizontal(STEEL_DENSITY);
    // 10% headroom — below the default 20% floor, but capacity not exceeded.
    const { arm } = buildHingedBeam({ torqueNm: expected * 1.1 });
    const r = await checkStaticHold(arm, { pose: { shoulder: 0 } });
    expect(r.ok).toBe(true);
    const diag = r.diagnostics.find((d) => d.code === 'assembly.joint.static-hold.margin-low');
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('warn');
  });

  it('missing actuator on the explicitly-named joint fires kinematic.static-hold.no-actuator-declared', async () => {
    const { arm } = buildHingedBeam({});
    const r = await checkStaticHold(arm, { joint: 'shoulder' });
    expect(r.ok).toBe(false);
    expect(r.joints).toHaveLength(0);
    const diag = r.diagnostics.find((d) => d.code === 'kinematic.static-hold.no-actuator-declared');
    expect(diag).toBeDefined();
  });

  it('empty assembly / no joints is a vacuous pass', async () => {
    const session = new CaptureSession();
    const kc = createScriptApi({ session });
    const arm = kc.assembly('empty');
    const r = await checkStaticHold(arm);
    expect(r.ok).toBe(true);
    expect(r.joints).toHaveLength(0);
  });
});
