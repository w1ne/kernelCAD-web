// tests/integration/manufacturing/snapFitBoxBenchmark.test.ts
//
// Manufacturing benchmark case 06 (#1227): an FDM box whose lid snaps on
// with two cantilever hooks. Following the 9 Nov scope update, pose is
// scored ahead of everything else and each gate is scored on its own:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. per-part pose: solve_mates puts the base at the origin and the lid on
//      the rim, with no rotation;
//   3. interference: review_cad finds no clash between the hooks and the
//      base walls;
//   4. retention: check_assembly_path reports the lid as a declared snap
//      step along +z, and with the snap declaration removed the base blocks
//      every straight removal of the lid, so the barbs hold it. Motion is
//      not applicable otherwise: the only mate is fastened;
//   5. the STEP export re-imports as two solids whose volumes and boxes
//      match the closed-form geometry of each part;
//   6. a Length edit through set_param's source rewrite keeps both hooks
//      centred in their windows and stays clash-free;
//   7. seeded defects (windows cut too high, hooks with no barbs, barbs
//      that stick out of the wall) fail. The first is caught by the build
//      itself.
// Not verified: beam strain while the hook deflects, PETG creep and the
// retention force. The force step is declared, never simulated.
// Tolerances are this fixture's own: 0.1 % on volume (exact B-rep faces),
// 0.01 mm on positions, and 1e-6 mm / 1e-6 degrees on solver poses.
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
import { checkAssemblyPathTool } from '../../../src/agent/mcp/tools/checkAssemblyPath';

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/snap-fit-lid-box.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

const DEFAULT_LENGTH = 60;
const EXPECTED_POSES: Record<'base' | 'lid', [number, number, number]> = { base: [0, 0, 0], lid: [0, 0, 20] };
const SNAP_DECLARATION = ", { fit: { kind: 'snap', part: 'lid', axis: [0, 0, 1] } }";

/** Closed-form volume of each authored part. */
function expectedVolumes(l: number): Record<'base' | 'lid', number> {
  const windows = 2 * 8 * 2 * 1.9;
  const hooks = 2 * (6 * 1.5 * 10 + 6 * 1.0 * 1.5);
  return {
    base: l * 30 * 20 - (l - 4) * 26 * 18 - windows,
    lid: l * 30 * 2 + hooks,
  };
}

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

/** The lid's planner state and its straight +z removal from check_assembly_path. */
async function lidRemoval(code: string) {
  const report = await checkAssemblyPathTool({ code });
  if (!report.ok && 'error' in report) throw new Error(report.error);
  if (!('parts' in report)) throw new Error('check_assembly_path returned no parts');
  const lid = report.parts.find((part) => part.part === 'lid');
  if (!lid) throw new Error('check_assembly_path: no lid');
  const up = lid.directions.find((d) => d.direction[0] === 0 && d.direction[1] === 0 && d.direction[2] === 1);
  if (!up) throw new Error('check_assembly_path: no +z direction');
  return { state: lid.state, up, removable: lid.removable };
}

async function exportSolids(code: string): Promise<StepSolidReport[]> {
  const exported = await runAndExport({ code, fileName: 'snap-fit-lid-box.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'snap-fit-lid-box.step');
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
  [l, 30, 20].forEach((v, i) => check(`base bbox.max[${i}]`, base.bboxExact.max[i], v));
  // The barbs stay inside the outer wall faces, so the lid box is the plate
  // plus the 10 mm hooks below it.
  [0, 0, 10].forEach((v, i) => check(`lid bbox.min[${i}]`, lid.bboxExact.min[i], v));
  [l, 30, 22].forEach((v, i) => check(`lid bbox.max[${i}]`, lid.bboxExact.max[i], v));
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 06: FDM snap-fit lid box (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('evaluates with no error and no degraded feature', async () => {
    await evaluateClean(SOURCE);
  }, 120_000);

  it('puts the base at the origin and the lid on the rim', async () => {
    expect(await poseFailures(SOURCE)).toEqual([]);
  }, 120_000);

  it('keeps the hooks clear of the base walls', async () => {
    expect(await clashFailures(SOURCE)).toEqual([]);
  }, 180_000);

  it('reports the lid as a declared snap step along +z', async () => {
    const { state } = await lidRemoval(SOURCE);
    expect(state).toMatchObject({ kind: 'requires-force', fit: 'snap', direction: [0, 0, 1] });
  }, 180_000);

  it('without the snap declaration, the barbs stop every straight removal of the lid', async () => {
    const { state, up, removable } = await lidRemoval(inject(SOURCE, SNAP_DECLARATION, ''));
    expect(removable).toBe(false);
    expect(up.clear).toBe(false);
    expect(up.blockingParts).toEqual(['base']);
    expect(state.kind).not.toBe('removable');
  }, 180_000);

  it('re-imports from STEP as two solids with closed-form volumes and boxes', async () => {
    expect(stepFailures(await exportSolids(SOURCE), DEFAULT_LENGTH)).toEqual([]);
  }, 120_000);

  it('a Length edit keeps both hooks centred in their windows and stays clash-free', async () => {
    const edited = setParamValue(SOURCE, 'Length', 90);
    if (!edited.ok) throw new Error(edited.error);
    await evaluateClean(edited.new_code);
    expect(await poseFailures(edited.new_code)).toEqual([]);
    expect(stepFailures(await exportSolids(edited.new_code), 90)).toEqual([]);
    expect(await clashFailures(edited.new_code)).toEqual([]);
    const { up } = await lidRemoval(inject(edited.new_code, SNAP_DECLARATION, ''));
    expect(up.blockingParts).toEqual(['base']);
  }, 300_000);

  it('catches windows cut too high, so the barbs push into the walls', async () => {
    const code = inject(SOURCE, 'height - beamLength - clearance))', 'height - beamLength + 1))');
    // The fixture builds with validate: 'error', so the overlap stops the build.
    const failures = await clashFailures(code);
    expect(failures).toContain('review_cad not ok');
    expect(failures).toContain('error assembly.interference.overlap');
  }, 180_000);

  it('catches hooks with no barbs, so nothing holds the lid', async () => {
    const code = inject(inject(SOURCE, 'const barb = 1.0;', 'const barb = 0;'),
      '  lid = lid.union(box(hookWidth, barb, barbHeight)', '  if (barb > 0) lid = lid.union(box(hookWidth, barb, barbHeight)');
    const { up } = await lidRemoval(inject(code, SNAP_DECLARATION, ''));
    expect(up.clear).toBe(true);
  }, 180_000);

  it('catches barbs that stick out of the outer wall faces', async () => {
    const code = inject(SOURCE, 'const barb = 1.0;', 'const barb = 2.5;');
    const failures = stepFailures(await exportSolids(code), DEFAULT_LENGTH);
    // Each barb ends 0.3 mm outside its wall face; the base itself is unchanged.
    expect(failures.map((f) => f.split(':')[0])).toEqual(['lid volume rel. error', 'lid bbox.min[1]', 'lid bbox.max[1]']);
    expect(failures[1]).toMatch(/^lid bbox\.min\[1\]: -0\.300/);
  }, 120_000);
});
