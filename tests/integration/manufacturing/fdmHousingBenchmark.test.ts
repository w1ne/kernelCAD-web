// tests/integration/manufacturing/fdmHousingBenchmark.test.ts
//
// Manufacturing benchmark case 05 (#1227): an FDM two-part housing, a base
// and a lid held by four M3 self-tapping screws. Following the 9 Nov scope
// update, pose is scored ahead of everything else and each gate is scored on
// its own:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. per-part pose: solve_mates puts the base at the origin and the lid on
//      the rim, with no rotation;
//   3. interference: review_cad finds no clash between the lid lip and the
//      base walls or bosses. Motion is not applicable: the only mate is
//      fastened;
//   4. the STEP export re-imports as two solids whose volumes match the
//      closed-form volume of each part; the named interfaces (M3 pilot holes
//      in the bosses, M3 clearance holes in the lid) are measured from the
//      STEP, and every lid hole is coaxial with a pilot hole;
//   5. a Length edit through set_param's source rewrite moves the far bosses
//      and the lid holes together and stays clash-free;
//   6. seeded defects (a lip with no clearance, lid holes off the boss axes,
//      pilot holes drilled to clearance size, a lip pocket cut into the lid
//      plate) fail. The first two are caught by the build itself.
// Tolerances are this fixture's own: 0.1 % on volume (exact B-rep faces),
// 0.01 mm on positions and diameters, and 1e-6 mm / 1e-6 degrees on solver
// poses.
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

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/fdm-two-part-housing.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

const DEFAULT_LENGTH = 60;
const EXPECTED_POSES: Record<'base' | 'lid', [number, number, number]> = { base: [0, 0, 0], lid: [0, 0, 20] };

/** Closed-form volume of each authored part. */
function expectedVolumes(l: number): Record<'base' | 'lid', number> {
  const shell = l * 40 * 20 - (l - 4) * 36 * 18;
  const bosses = 4 * Math.PI * 3 ** 2 * 18 - 4 * Math.PI * 1.25 ** 2 * 10;
  const usbC = 2 * 9 * 3.5;
  const lipRing = ((l - 4.4) * 35.6 - (l - 6.8) * 33.2) * 3;
  return {
    base: shell + bosses - usbC,
    lid: l * 40 * 2 + lipRing - 4 * Math.PI * 1.7 ** 2 * 2,
  };
}

/** Boss axes (x, y) for housing length `l`. */
const bossAxes = (l: number): Array<[number, number]> => [[7, 7], [l - 7, 7], [7, 33], [l - 7, 33]];

async function evaluateClean(code: string): Promise<void> {
  const evaluated = await evaluateScript({ code, scriptDir: join(__dirname, '../../fixtures/manufacturing') });
  expect(evaluated.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(evaluated.exitCode).toBe(0);
  expect(evaluated.featureHealth).toEqual([]);
}

/** Every pose failure; [] is a pass. */
async function poseFailures(code: string): Promise<string[]> {
  const ev = await evaluateScriptTool({ code });
  if (!ev.ok) return [`evaluate_script failed`];
  const solved = await solveMatesTool({});
  if (!solved.ok) return [`solve_mates failed: ${solved.error}`];
  if (solved.status !== 'solved') return [`solve_mates status: ${solved.status}`];
  const failures: string[] = [];
  for (const [part, expected] of Object.entries(EXPECTED_POSES)) {
    const pose = solved.poses[part];
    if (!pose) { failures.push(`${part}: no pose`); continue; }
    pose.translation.forEach((v, i) => {
      if (!(Math.abs(v - expected[i]) < 1e-6)) failures.push(`${part} translation[${i}]: ${v} != ${expected[i]}`);
    });
    if (!(Math.abs(pose.rotateDeg) < 1e-6)) failures.push(`${part} rotation: ${pose.rotateDeg}`);
  }
  return failures;
}

/** Every interference failure from review_cad; [] is a pass. */
async function clashFailures(code: string): Promise<string[]> {
  const review = await reviewCadTool({ code, includeInterference: true });
  const failures: string[] = [];
  if (!review.ok) failures.push('review_cad not ok');
  for (const d of review.diagnostics) {
    if (d.severity === 'error') failures.push(`error ${d.code}`);
  }
  if ((review.rawInterferencePairs ?? []).length > 0) failures.push(`interference pairs: ${review.rawInterferencePairs!.length}`);
  return failures;
}

async function exportSolids(code: string): Promise<StepSolidReport[]> {
  const exported = await runAndExport({ code, fileName: 'fdm-two-part-housing.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'fdm-two-part-housing.step');
  return report.solids;
}

/** Every STEP failure for the exported solids against Length `l`; [] is a pass. */
function stepFailures(solids: StepSolidReport[], l: number): string[] {
  if (solids.length !== 2) return [`solids: ${solids.length} != 2`];
  const failures: string[] = [];
  const check = (label: string, actual: number, expected: number, tol = 0.01) => {
    if (!(Math.abs(actual - expected) < tol)) failures.push(`${label}: ${actual} != ${expected}`);
  };
  // The STEP solids carry no part names; the base is the larger one.
  const [base, lid] = [...solids].sort((a, b) => b.volumeMm3 - a.volumeMm3);
  const volumes = expectedVolumes(l);
  check('base volume rel. error', Math.abs(base.volumeMm3 - volumes.base) / volumes.base, 0, 1e-3);
  check('lid volume rel. error', Math.abs(lid.volumeMm3 - volumes.lid) / volumes.lid, 0, 1e-3);

  [0, 0, 0].forEach((v, i) => check(`base bbox.min[${i}]`, base.bboxExact.min[i], v));
  [l, 40, 20].forEach((v, i) => check(`base bbox.max[${i}]`, base.bboxExact.max[i], v));
  [0, 0, 17].forEach((v, i) => check(`lid bbox.min[${i}]`, lid.bboxExact.min[i], v));
  [l, 40, 22].forEach((v, i) => check(`lid bbox.max[${i}]`, lid.bboxExact.max[i], v));

  const holesOf = (solid: StepSolidReport, diameter: number) => solid.holes.filter((hole) =>
    Math.abs(hole.diameterMm - diameter) < 0.01 && Math.abs(Math.abs(hole.axisDirection[2]) - 1) < 1e-6);
  // Each set must sit on the four boss axes.
  const onBosses = (label: string, found: StepSolidReport['holes'], kind: 'blind' | 'through', depth: number, mouthZ?: number) => {
    if (found.length !== 4) { failures.push(`${label} holes: ${found.length} != 4`); return; }
    for (const hole of found) {
      check(`${label} depth`, hole.depthMm, depth);
      if (hole.kind !== kind) failures.push(`${label} kind: ${hole.kind}`);
      if (mouthZ !== undefined) check(`${label} mouth z`, hole.axisOrigin[2], mouthZ);
    }
    for (const [x, y] of bossAxes(l)) {
      const onAxis = found.some((hole) => Math.abs(hole.axisOrigin[0] - x) < 0.01 && Math.abs(hole.axisOrigin[1] - y) < 0.01);
      if (!onAxis) failures.push(`${label}: no hole on the boss axis at x ${x}, y ${y}`);
    }
  };
  onBosses('M3 pilot', holesOf(base, 2.5), 'blind', 10, 20);
  onBosses('M3 clearance', holesOf(lid, 3.4), 'through', 2);
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 05: FDM two-part housing (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('evaluates with no error and no degraded feature', async () => {
    await evaluateClean(SOURCE);
  }, 120_000);

  it('puts the base at the origin and the lid on the rim', async () => {
    expect(await poseFailures(SOURCE)).toEqual([]);
  }, 120_000);

  it('locates the lid lip inside the base with no clash', async () => {
    expect(await clashFailures(SOURCE)).toEqual([]);
  }, 180_000);

  it('re-imports from STEP as two solids with closed-form volumes and coaxial screw holes', async () => {
    expect(stepFailures(await exportSolids(SOURCE), DEFAULT_LENGTH)).toEqual([]);
  }, 120_000);

  it('a Length edit moves the far bosses and the lid holes together and stays clash-free', async () => {
    const edited = setParamValue(SOURCE, 'Length', 80);
    if (!edited.ok) throw new Error(edited.error);
    await evaluateClean(edited.new_code);
    expect(await poseFailures(edited.new_code)).toEqual([]);
    expect(stepFailures(await exportSolids(edited.new_code), 80)).toEqual([]);
    expect(await clashFailures(edited.new_code)).toEqual([]);
  }, 300_000);

  it('catches a lip with no clearance to the base walls', async () => {
    const code = inject(SOURCE, 'const clearance = 0.2;', 'const clearance = -0.2;');
    // The fixture builds with validate: 'error', so the overlap stops the build.
    const failures = await clashFailures(code);
    expect(failures).toContain('review_cad not ok');
    expect(failures).toContain('error assembly.interference.overlap');
  }, 180_000);

  it('catches lid holes drilled off the boss axes', async () => {
    const code = inject(SOURCE, 'cylinder(4, 1.7).translate(x, y, -1)', 'cylinder(4, 1.7).translate(x, y + 0.5, -1)');
    // The fastened mate checks that a screw passes through both parts.
    const review = await reviewCadTool({ code, includeInterference: true });
    expect(review.ok).toBe(false);
    const errors = review.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(errors[0].message).toMatch(/0\.5 mm off-axis/);
  }, 180_000);

  it('catches pilot holes drilled to clearance size, so the screws cannot bite', async () => {
    const code = inject(SOURCE, 'cylinder(11, 1.25)', 'cylinder(11, 1.7)');
    const failures = stepFailures(await exportSolids(code), DEFAULT_LENGTH);
    expect(failures).toContain('M3 pilot holes: 0 != 4');
  }, 120_000);

  it('catches a lip pocket cut into the lid plate', async () => {
    // The pocket is cut after the union, and its 5 mm box reaches z = 1.
    const code = inject(SOURCE, 'let lid = box(length, width, 2).union(lipRing);',
      'let lid = box(length, width, 2).union(box(length.subtract(2 * inset), width - 2 * inset, 3).translate(inset, inset, -3))'
      + '.subtract(box(length.subtract(2 * (inset + lip)), width - 2 * (inset + lip), 5).translate(inset + lip, inset + lip, -4));');
    const failures = stepFailures(await exportSolids(code), DEFAULT_LENGTH);
    expect(failures).toContain('M3 clearance depth: 1 != 2');
  }, 120_000);
});
