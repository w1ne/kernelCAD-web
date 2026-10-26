// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// S5: a structural study cannot invent its load. `feaStudy({ loadsFrom })`
// takes the worst sampled joint wrench from a motion study, records the pose
// that produced it, and writes that pose into the requirements ledger.
//
// The fixture is a steel bar on a revolute mate about +Y. Gravity is the only
// load, so the worst shoulder bending moment is analytically at the
// horizontal pose (hinge = 0°): tau = m g L/2. The part studied is the wall
// bracket (the parent side), fixed at its back face, so the joint reaction is
// a real load on it rather than a self-equilibrated root load on the bar.

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { runScript } from '../../../src/composition/runScript';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { findFeaStudies } from '../../../src/modeling/runtime/fea/findFeaStudies';
import { runInProcessFeaStudy } from '../../../src/kernel/fea/inProcess/runInProcessFea';
import { feaRequirementEntries } from '../../../src/modeling/requirements/feaLedger';
import { equivalentRemoteLoad } from '../../../src/kernel/fea/remoteLoad';
import type { FeaGateReport } from '../../../src/modeling/runtime/fea/runFeaGate';


const L = 300, W = 20, H = 10, RHO = 7850, G = 9.81;
const MASS = RHO * (L * W * H) * 1e-9;
const ANALYTIC_MOMENT_NMM = MASS * G * (L / 2); // N * mm

/** `pose` omitted: sample the joint-limit range (worst is known to be 0°). */
function script(opts: { pose?: number; study?: boolean } = {}): string {
  const study = opts.study === false ? '' : `
wallShape.feaStudy({
  name: 'bracket',
  material: 'mild-steel',
  fixed: { atX: -40 },
  loadsFrom: { motion, part: 'wall' },
  minSafetyFactor: 1.5,
  meshSize: 4,
});`;
  const motionOpts = opts.pose === undefined
    ? "{ mode: 'range', rangeSamples: 5 }"
    : `{ poses: [{ hinge: ${opts.pose} }] }`;
  return `
const arm = assembly('motion-fea');
const wallShape = box(40, 40, 40, true).translate(-20, 0, 0);
const wall = arm.part('wall', wallShape, { density: 1000 });
const bar = arm.part('bar', box(${L}, ${W}, ${H}, true).translate(${L / 2}, 0, 0), {
  density: ${RHO},
  crossSection: { kind: 'rectangle', widthMm: ${W}, heightMm: ${H}, lengthMm: ${L} },
});
const d = { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] };
wall.connector('hinge-out', d);
bar.connector('hinge-in', d);
arm.mate('hinge', 'wall.hinge-out', 'bar.hinge-in', 'revolute', { limitsDeg: [-90, 90] });
arm.mechanicalJoint('hinge-drive', { mate: 'hinge', actuator: 'wall', shaft: 'bar', supports: ['wall'], output: 'bar' });
arm.physicalUseCase('bench', { stableParts: ['wall'] });
const motion = await kinematic.motionLoad(arm, ${motionOpts});
${study}
return arm.model();
`;
}

async function capture(code: string) {
  return runScript({ code, fileName: 'motion-fea.kcad.ts' });
}

async function loweredStudy(code: string) {
  await initOcct();
  const run = await capture(code);
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const lowered = await engine.run(run.records, { paramTable: run.session.paramTable });
  const study = findFeaStudies(run.records)[0]!;
  const shape = lowered.shapes.get(study.shapeId);
  if (!(shape instanceof OcctBackend)) throw new Error('the study shape did not lower to an OCCT solid');
  return { run, study, shape };
}

describe('feaStudy({ loadsFrom: motionLoad(...) })', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('captures the worst sampled pose and the joint wrench, with no hand-typed load', async () => {
    const run = await capture(script());
    const study = findFeaStudies(run.records)[0]!;
    const load = study.metadata.loads[0]!;
    expect(study.metadata.loads).toHaveLength(1);
    expect(load.name).toBe('motion:hinge-drive');
    expect(load.fromMotion).toBeDefined();
    // Gravity on a horizontal cantilever: the worst pose is the horizontal one.
    expect(load.fromMotion!.pose.hinge).toBe(0);
    expect(load.fromMotion!.part).toBe('wall');
    expect(load.fromMotion!.side).toBe('parent');
    // Reaction on the wall: the bar's weight and the moment that holds it.
    expect(Math.abs(load.force[2])).toBeCloseTo(MASS * G, 4);
    expect(Math.abs(load.momentNmm![1]!)).toBeCloseTo(ANALYTIC_MOMENT_NMM, 2);
    // The remote wrench is applied at the joint origin in the wall's frame.
    expect(load.pointMm).toEqual([0, 0, 0]);
  }, 120_000);

  it('honours a user-named pose when the motion study sampled it', async () => {
    const run = await capture(script({ pose: 45 }));
    const load = findFeaStudies(run.records)[0]!.metadata.loads[0]!;
    expect(load.fromMotion!.pose).toEqual({ hinge: 45 });
    expect(Math.abs(load.momentNmm![1]!)).toBeCloseTo(ANALYTIC_MOMENT_NMM * Math.cos(Math.PI / 4), 1);
  }, 120_000);

  it('fails honestly when the motion result has no part load (no fabricated pass)', async () => {
    await expect(capture(`
      const arm = assembly('no-drive');
      const frame = box(20, 20, 20);
      const plate = box(10, 10, 2).translate(5, 0, 0);
      const p = arm.part('frame', frame);
      arm.part('plate', plate);
      const motion = await kinematic.motionLoad(arm, { mode: 'range' });
      frame.feaStudy({ material: 'mild-steel', fixed: { atX: 0 }, loadsFrom: { motion, part: 'frame' } });
      return arm.model();
    `)).rejects.toThrow(/has no sampled load on part 'frame'/);
  }, 60_000);

  it('rejects loads and loadsFrom together', async () => {
    await expect(capture(script()).then(() => capture(`
      const arm = assembly('both');
      const b = box(10, 10, 10);
      const motion = await kinematic.motionLoad(arm, { mode: 'range' });
      b.feaStudy({ material: 'pla', fixed: { atZ: 0 }, loads: [{ faces: { atZ: 10 }, force: [1, 0, 0] }], loadsFrom: { motion: motion, part: 'x' } });
      return b;
    `))).rejects.toThrow(/mutually exclusive/);
  }, 60_000);
});

describe('motion-derived FEA solve and ledger', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('solves the bracket with the remote wrench and names the pose in the ledger', async () => {
    const { run, study, shape } = await loweredStudy(script());
    const outDir = await mkdtemp(join(tmpdir(), 'kcad-s5-fea-'));
    try {
      const result = await runInProcessFeaStudy(shape, study.metadata, study.shapeId, run.records, {
        outDir,
        paramTable: run.session.paramTable,
      });
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const s = result.summary!;
      expect(s, 'a completed solve should produce a summary').toBeDefined();
      expect(s.loadsFrom?.pose.hinge).toBe(0);
      expect(s.appliedForceN[2]).toBeCloseTo(-MASS * G, 4);
      expect(s.appliedMomentNmm?.[1]).toBeCloseTo(ANALYTIC_MOMENT_NMM, 2);
      expect(Number.isFinite(s.minSafetyFactor)).toBe(true);
      expect(s.minSafetyFactor).toBeGreaterThan(1);
      expect(s.equilibriumResidual ?? 0).toBeLessThan(0.05);

      const report: FeaGateReport = { diagnostics: [], skipped: [], summaries: [{ ...s, minSafetyFactorRequired: 1.5 }] };
      const entry = feaRequirementEntries(report)[0]!;
      expect(entry.name).toBe('fea.bracket.minSafetyFactor');
      expect(entry.status).toBe('pass');
      expect(entry.message).toContain('hinge=0°');
      expect(entry.message).toContain('margin');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }, 180_000);
});

describe('servo-arm cookbook 07', () => {
  it('reports a safety factor at the worst motion pose with no hand-typed load', async () => {
    const r = await evaluateScript({ file: 'src/agent/skills/kernelcad-kinematic/cookbook/07-static-hold-servo-arm.kcad.ts' });
    expect(r.exitCode, r.diagnostics.map((d) => `${d.code}: ${d.message}`).join('\n')).toBe(0);
    const entry = r.requirements?.entries.find((e) => e.name === 'fea.servo-bracket.minSafetyFactor');
    expect(entry, 'the cookbook must report the bracket FEA ledger entry').toBeDefined();
    expect(entry!.margin).not.toBeNull();
    expect(entry!.message).toContain('shoulder=0°');
    expect(entry!.message).toContain('margin');
  }, 300_000);
});

describe('remote wrench distribution', () => {
  it('reproduces both the force and the moment on the node set', () => {
    const nodes = [
      { id: 1, at: [0, 0, 0] as const },
      { id: 2, at: [10, 0, 0] as const },
      { id: 3, at: [0, 10, 0] as const },
      { id: 4, at: [0, 0, 10] as const },
    ];
    const point = [0, 0, 0] as const;
    const force = [1, 2, 3] as const;
    const moment = [400, 500, 600] as const;
    const out = equivalentRemoteLoad(nodes, point, force, moment)!;
    const sum = out.reduce<[number, number, number]>((a, f) => [a[0] + f.force[0], a[1] + f.force[1], a[2] + f.force[2]], [0, 0, 0]);
    const mom = out.reduce<[number, number, number]>((a, f) => {
      const n = nodes.find((x) => x.id === f.node)!;
      const r = [n.at[0] - point[0], n.at[1] - point[1], n.at[2] - point[2]];
      return [
        a[0] + (r[1] * f.force[2] - r[2] * f.force[1]),
        a[1] + (r[2] * f.force[0] - r[0] * f.force[2]),
        a[2] + (r[0] * f.force[1] - r[1] * f.force[0]),
      ];
    }, [0, 0, 0]);
    expect(sum[0]).toBeCloseTo(force[0], 9);
    expect(sum[1]).toBeCloseTo(force[1], 9);
    expect(sum[2]).toBeCloseTo(force[2], 9);
    expect(mom[0]).toBeCloseTo(moment[0], 6);
    expect(mom[1]).toBeCloseTo(moment[1], 6);
    expect(mom[2]).toBeCloseTo(moment[2], 6);
  });
});
