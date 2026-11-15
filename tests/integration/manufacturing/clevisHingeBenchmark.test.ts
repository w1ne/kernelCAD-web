// tests/integration/manufacturing/clevisHingeBenchmark.test.ts
//
// Manufacturing benchmark case 03 (#1227): a pinned clevis hinge, the small
// multi-part mechanism case. Following the 9 Nov scope update, pose is scored
// ahead of everything else and each gate is scored on its own:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. per-part pose: solve_mates puts every part at its expected world
//      translation and orientation at the hinge rest pose and both limits;
//   3. interference and motion: review_cad finds no clash at rest or at
//      either limit, and its pose envelope really sampled both limits;
//   4. the STEP export re-imports as three solids whose volumes match the
//      closed-form volume of each part and whose bores are coaxial with the
//      pin on the authored pivot;
//   5. a PivotHeight + ArmLength edit through set_param's source rewrite
//      moves the pivot, the arm and the pin together and stays clash-free;
//   6. seeded defects (an arm too thick for the slot, a travel range that
//      swings the arm into the base, a clevis bore off the pivot) fail.
// Tolerances are this fixture's own: 0.1 % on volume (exact B-rep faces),
// 0.01 mm on positions and diameters (STEP bboxes are tessellation-tight,
// so the pin's round faces get 0.01 mm), and 1e-6 mm / 1e-6 degrees on
// solver poses.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScript } from '../../../src/composition/scriptEvaluation';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectStepBuffer, type StepSolidReport } from '../../../src/kernel/import/inspectStep';
import { setParamValue } from '../../../src/modeling/edits/setParamValue';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { solveMatesTool } from '../../../src/agent/mcp/tools/solveMates';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/clevis-hinge.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

interface HingeParams { pivotHeight: number; armLength: number }
const DEFAULTS: HingeParams = { pivotHeight: 20, armLength: 60 };

/** World position of the pivot axis at the slot centre. */
const pivotOf = (p: HingeParams): [number, number, number] => [20, 15, p.pivotHeight];

/** Closed-form volume of each authored part. */
function expectedVolumes(p: HingeParams): Record<'clevis' | 'arm' | 'pin', number> {
  const bore = Math.PI * 2.6 ** 2;
  return {
    clevis: 40 * 30 * 5 + 2 * 5 * 30 * p.pivotHeight - 2 * 5 * bore,
    arm: 9 * 10 * (p.armLength + 5) - 9 * bore,
    pin: Math.PI * 2.5 ** 2 * 24,
  };
}

async function evaluateClean(code: string): Promise<void> {
  const evaluated = await evaluateScript({ code, scriptDir: join(__dirname, '../../fixtures/manufacturing') });
  expect(evaluated.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(evaluated.exitCode).toBe(0);
  expect(evaluated.featureHealth).toEqual([]);
}

/** Every pose failure at hinge angle `deg`; [] is a pass. */
async function poseFailures(code: string, p: HingeParams, deg: number): Promise<string[]> {
  const ev = await evaluateScriptTool({ code });
  if (!ev.ok) return [`evaluate_script failed`];
  const solved = await solveMatesTool({ poses: { hinge: deg } });
  if (!solved.ok) return [`solve_mates failed: ${solved.error}`];
  if (solved.status !== 'solved') return [`solve_mates status: ${solved.status}`];
  const failures: string[] = [];
  const pivot = pivotOf(p);
  for (const part of ['clevis', 'arm', 'pin']) {
    const pose = solved.poses[part];
    if (!pose) { failures.push(`${part}: no pose`); continue; }
    pose.translation.forEach((v, i) => {
      if (!(Math.abs(v - pivot[i]) < 1e-6)) failures.push(`${part} translation[${i}]: ${v} != ${pivot[i]}`);
    });
    // Only the arm turns, and only about the pin axis (X).
    const turn = part === 'arm' ? deg : 0;
    const signed = Math.abs(pose.rotateDeg) < 1e-6 ? 0 : pose.rotateDeg * Math.sign(pose.rotateAxis[0]);
    if (turn !== 0 && !(Math.abs(Math.abs(pose.rotateAxis[0]) - 1) < 1e-6)) {
      failures.push(`${part} rotation axis: ${pose.rotateAxis} is not X`);
    }
    if (!(Math.abs(signed - turn) < 1e-6)) failures.push(`${part} rotation: ${signed} != ${turn}`);
  }
  return failures;
}

/** Every interference or motion failure from review_cad; [] is a pass. */
async function motionFailures(code: string, limits: [number, number] = [-90, 90]): Promise<string[]> {
  const review = await reviewCadTool({ code, includeInterference: true, includePoseEnvelope: true });
  const failures: string[] = [];
  if (!review.ok) failures.push('review_cad not ok');
  for (const d of review.diagnostics) {
    if (d.severity === 'error') failures.push(`error ${d.code}`);
  }
  if ((review.rawInterferencePairs ?? []).length > 0) failures.push(`interference pairs: ${review.rawInterferencePairs!.length}`);
  const envelope = review.poseEnvelope;
  if (!envelope) return [...failures, 'no pose envelope'];
  const sampled = envelope.samples.map((s) => s.poses.hinge).filter((v) => v !== undefined).sort((a, b) => a - b);
  if (JSON.stringify(sampled) !== JSON.stringify(limits)) failures.push(`hinge samples: ${sampled} != ${limits}`);
  for (const pair of envelope.interferencePairs) failures.push(`envelope clash at ${pair.sampleName}: ${pair.a}/${pair.b}`);
  if (review.mechanismSummary?.verdict !== 'real') failures.push(`mechanism verdict: ${review.mechanismSummary?.verdict}`);
  return failures;
}

async function exportSolids(code: string): Promise<StepSolidReport[]> {
  const exported = await runAndExport({ code, fileName: 'clevis-hinge.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'clevis-hinge.step');
  return report.solids;
}

/** Every STEP failure for the exported solids against `p` at rest; [] is a pass. */
function stepFailures(solids: StepSolidReport[], p: HingeParams): string[] {
  if (solids.length !== 3) return [`solids: ${solids.length} != 3`];
  const failures: string[] = [];
  const check = (label: string, actual: number, expected: number, tol = 0.01) => {
    if (!(Math.abs(actual - expected) < tol)) failures.push(`${label}: ${actual} != ${expected}`);
  };
  // The STEP solids carry no part names, so match each part by its volume.
  const volumes = expectedVolumes(p);
  const byPart = Object.fromEntries(Object.entries(volumes).map(([part, v]) => {
    const match = solids.filter((s) => Math.abs(s.volumeMm3 - v) / v < 1e-3);
    return [part, match.length === 1 ? match[0] : undefined];
  })) as Record<keyof typeof volumes, StepSolidReport | undefined>;
  for (const [part, solid] of Object.entries(byPart)) {
    if (!solid) failures.push(`${part}: no solid with volume ${volumes[part as keyof typeof volumes]}`);
  }
  const { clevis, arm, pin } = byPart;
  if (!clevis || !arm || !pin) return failures;
  const [, py, pz] = pivotOf(p);

  check('clevis bbox.max z', clevis.bboxExact.max[2], p.pivotHeight + 5);
  check('arm bbox.min z', arm.bboxExact.min[2], p.pivotHeight - 5);
  check('arm bbox.max z', arm.bboxExact.max[2], p.pivotHeight + p.armLength);
  check('arm bbox.min x', arm.bboxExact.min[0], 15.5);
  check('arm bbox.max x', arm.bboxExact.max[0], 24.5);
  check('pin bbox.min x', pin.bboxExact.min[0], 8);
  check('pin bbox.max x', pin.bboxExact.max[0], 32);
  check('pin centre y', (pin.bboxExact.min[1] + pin.bboxExact.max[1]) / 2, py);
  check('pin centre z', (pin.bboxExact.min[2] + pin.bboxExact.max[2]) / 2, pz);

  const bores = (solid: StepSolidReport, label: string, count: number, depth: number) => {
    const found = solid.holes.filter((h) => Math.abs(h.diameterMm - 5.2) < 0.01);
    if (found.length !== count) { failures.push(`${label} bores: ${found.length} != ${count}`); return; }
    for (const h of found) {
      if (!(Math.abs(Math.abs(h.axisDirection[0]) - 1) < 1e-6)) failures.push(`${label} bore axis: ${h.axisDirection}`);
      if (h.kind !== 'through') failures.push(`${label} bore kind: ${h.kind}`);
      check(`${label} bore depth`, h.depthMm, depth);
      check(`${label} bore y`, h.axisOrigin[1], py);
      check(`${label} bore z`, h.axisOrigin[2], pz);
    }
  };
  bores(clevis, 'clevis', 2, 5);
  bores(arm, 'arm', 1, 9);
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 03: pinned clevis hinge (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('evaluates with no error and no degraded feature', async () => {
    await evaluateClean(SOURCE);
  }, 120_000);

  it.each([0, 90, -90])('puts every part at its expected pose with the hinge at %i degrees', async (deg) => {
    expect(await poseFailures(SOURCE, DEFAULTS, deg)).toEqual([]);
  }, 120_000);

  it('swings through both limits with no clash and a real mechanism verdict', async () => {
    expect(await motionFailures(SOURCE)).toEqual([]);
  }, 180_000);

  it('re-imports from STEP as three solids with closed-form volumes and coaxial bores on the pivot', async () => {
    expect(stepFailures(await exportSolids(SOURCE), DEFAULTS)).toEqual([]);
  }, 120_000);

  it('a PivotHeight and ArmLength edit moves the pivot, arm and pin together and stays clash-free', async () => {
    const raised = setParamValue(SOURCE, 'PivotHeight', 30);
    if (!raised.ok) throw new Error(raised.error);
    const edited = setParamValue(raised.new_code, 'ArmLength', 80);
    if (!edited.ok) throw new Error(edited.error);
    const p = { pivotHeight: 30, armLength: 80 };
    await evaluateClean(edited.new_code);
    expect(await poseFailures(edited.new_code, p, 90)).toEqual([]);
    expect(stepFailures(await exportSolids(edited.new_code), p)).toEqual([]);
    expect(await motionFailures(edited.new_code)).toEqual([]);
  }, 300_000);

  it('catches an arm too thick for the clevis slot', async () => {
    const code = inject(SOURCE, 'box(9, 10, armLength.add(5))\n  .translate(-4.5,', 'box(11, 10, armLength.add(5))\n  .translate(-5.5,');
    // The fixture builds with validate: 'error', so the rest-pose clash with
    // the cheeks stops the build before any pose is swept.
    const failures = await motionFailures(code);
    expect(failures).toContain('review_cad not ok');
    expect(failures).toContain('error assembly.interference.overlap');
  }, 180_000);

  it('catches a travel range that swings the arm into the base plate', async () => {
    const code = inject(SOURCE, 'limitsDeg: [-90, 90]', 'limitsDeg: [-150, 150]');
    // At rest the arm is clear, so only the limit samples can find the clash.
    expect(stepFailures(await exportSolids(code), DEFAULTS)).toEqual([]);
    const failures = await motionFailures(code, [-150, 150]);
    expect(failures.some((f) => /^envelope clash at hinge:(min|max): (clevis\/arm|arm\/clevis)$/.test(f))).toBe(true);
  }, 180_000);

  it('catches a clevis bore drilled off the pivot axis', async () => {
    const code = inject(SOURCE, 'boreAlongX(22).translate(-11, 0, 0)', 'boreAlongX(22).translate(-11, 0, 1)');
    const failures = stepFailures(await exportSolids(code), DEFAULTS);
    expect(failures).toEqual(['clevis bore z: 21 != 20', 'clevis bore z: 21 != 20']);
  }, 120_000);
});
