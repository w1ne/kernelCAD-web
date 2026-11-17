// tests/integration/manufacturing/linearSlideBenchmark.test.ts
//
// Manufacturing benchmark case 07 (#1227): a CNC linear slide whose
// carriage runs on a prismatic mate between two milled end stops.
// Following the 9 Nov scope update, pose is scored ahead of everything else
// and each gate is scored on its own:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. per-part pose: solve_mates keeps the rail at the origin and moves the
//      carriage along +x only, by the mate value, at rest, mid-travel and
//      the far limit;
//   3. interference and motion: review_cad finds no clash at rest, and its
//      pose envelope really sampled both travel limits with no clash;
//   4. the STEP export re-imports as two solids whose volumes and boxes
//      match the closed-form geometry of each part;
//   5. a RailWidth edit through set_param's source rewrite widens the
//      carriage channel with the rail and stays clash-free over the travel;
//   6. seeded defects (a travel limit that runs into the far stop, a channel
//      narrower than the rail, M4 holes in place of M5) fail. The second is
//      caught by the build itself.
// Not verified: a rail length edit (limitsMm takes numbers only, so travel
// does not follow the rail), screws, wear and running friction.
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

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/linear-slide-stops.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

const DEFAULT_WIDTH = 20;
const TRAVEL = 72;
/** World x of the carriage's near end at slide = 0: 1 mm off the 8 mm stop. */
const NEAR_X = 9;

/** Closed-form volume of each authored part. */
function expectedVolumes(w: number): Record<'rail' | 'carriage', number> {
  const holes = 2 * Math.PI * 2.75 ** 2 * 20;
  return {
    rail: 120 * w * 10 + 2 * 8 * w * 10 - holes,
    carriage: 30 * (w + 10) * 16 - 30 * (w + 0.4) * 10.2,
  };
}

async function evaluateClean(code: string): Promise<void> {
  const evaluated = await evaluateScript({ code, scriptDir: join(__dirname, '../../fixtures/manufacturing') });
  expect(evaluated.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(evaluated.exitCode).toBe(0);
  expect(evaluated.featureHealth).toEqual([]);
}

/** Every pose failure at slide value `mm`; [] is a pass. */
async function poseFailures(code: string, mm: number): Promise<string[]> {
  const ev = await evaluateScriptTool({ code });
  if (!ev.ok) return [`evaluate_script failed`];
  const solved = await solveMatesTool({ poses: { slide: mm } });
  if (!solved.ok) return [`solve_mates failed: ${solved.error}`];
  if (solved.status !== 'solved') return [`solve_mates status: ${solved.status}`];
  const expected: Record<'rail' | 'carriage', [number, number, number]> = {
    rail: [0, 0, 0],
    carriage: [NEAR_X + mm, 0, 0],
  };
  const failures: string[] = [];
  for (const [part, at] of Object.entries(expected)) {
    const pose = solved.poses[part];
    if (!pose) { failures.push(`${part}: no pose`); continue; }
    pose.translation.forEach((v, i) => {
      if (!(Math.abs(v - at[i]) < 1e-6)) failures.push(`${part} translation[${i}]: ${v} != ${at[i]}`);
    });
    if (!(Math.abs(pose.rotateDeg) < 1e-6)) failures.push(`${part} rotation: ${pose.rotateDeg}`);
  }
  return failures;
}

/** Every interference or motion failure from review_cad; [] is a pass. */
async function motionFailures(code: string, limits: [number, number] = [0, TRAVEL]): Promise<string[]> {
  const review = await reviewCadTool({ code, includeInterference: true, includePoseEnvelope: true });
  const failures: string[] = [];
  if (!review.ok) failures.push('review_cad not ok');
  for (const d of review.diagnostics) {
    if (d.severity === 'error') failures.push(`error ${d.code}`);
  }
  if ((review.rawInterferencePairs ?? []).length > 0) failures.push(`interference pairs: ${review.rawInterferencePairs!.length}`);
  const envelope = review.poseEnvelope;
  if (!envelope) return [...failures, 'no pose envelope'];
  const sampled = envelope.samples.map((s) => s.poses.slide).filter((v) => v !== undefined).sort((a, b) => a - b);
  if (JSON.stringify(sampled) !== JSON.stringify(limits)) failures.push(`slide samples: ${sampled} != ${limits}`);
  for (const pair of envelope.interferencePairs) failures.push(`envelope clash at ${pair.sampleName}: ${pair.a}/${pair.b}`);
  if (review.mechanismSummary?.verdict !== 'real') failures.push(`mechanism verdict: ${review.mechanismSummary?.verdict}`);
  return failures;
}

async function exportSolids(code: string): Promise<StepSolidReport[]> {
  const exported = await runAndExport({ code, fileName: 'linear-slide-stops.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'linear-slide-stops.step');
  return report.solids;
}

/** Every STEP failure for the exported solids against RailWidth `w` at rest; [] is a pass. */
function stepFailures(solids: StepSolidReport[], w: number): string[] {
  if (solids.length !== 2) return [`solids: ${solids.length} != 2`];
  const failures: string[] = [];
  const check = (label: string, actual: number, expected: number, tol = 0.01) => {
    if (!(Math.abs(actual - expected) < tol)) failures.push(`${label}: ${actual} != ${expected}`);
  };
  // The STEP solids carry no part names; the rail is the larger one.
  const [rail, carriage] = [...solids].sort((a, b) => b.volumeMm3 - a.volumeMm3);
  const volumes = expectedVolumes(w);
  check('rail volume rel. error', Math.abs(rail.volumeMm3 - volumes.rail) / volumes.rail, 0, 1e-3);
  check('carriage volume rel. error', Math.abs(carriage.volumeMm3 - volumes.carriage) / volumes.carriage, 0, 1e-3);

  [0, 0, 0].forEach((v, i) => check(`rail bbox.min[${i}]`, rail.bboxExact.min[i], v));
  [120, w, 20].forEach((v, i) => check(`rail bbox.max[${i}]`, rail.bboxExact.max[i], v));
  [NEAR_X, -5, 0].forEach((v, i) => check(`carriage bbox.min[${i}]`, carriage.bboxExact.min[i], v));
  [NEAR_X + 30, w + 5, 16].forEach((v, i) => check(`carriage bbox.max[${i}]`, carriage.bboxExact.max[i], v));
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 07: CNC linear slide with end stops (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('evaluates with no error and no degraded feature', async () => {
    await evaluateClean(SOURCE);
  }, 120_000);

  it.each([0, TRAVEL / 2, TRAVEL])('keeps the rail fixed and moves the carriage along +x only at slide = %d mm', async (mm) => {
    expect(await poseFailures(SOURCE, mm)).toEqual([]);
  }, 120_000);

  it('runs the full travel without touching the rail or either stop', async () => {
    expect(await motionFailures(SOURCE)).toEqual([]);
  }, 180_000);

  it('re-imports from STEP as two solids with closed-form volumes and boxes', async () => {
    expect(stepFailures(await exportSolids(SOURCE), DEFAULT_WIDTH)).toEqual([]);
  }, 120_000);

  it('a RailWidth edit widens the channel with the rail and stays clash-free', async () => {
    const edited = setParamValue(SOURCE, 'RailWidth', 30);
    if (!edited.ok) throw new Error(edited.error);
    await evaluateClean(edited.new_code);
    expect(await poseFailures(edited.new_code, TRAVEL)).toEqual([]);
    expect(stepFailures(await exportSolids(edited.new_code), 30)).toEqual([]);
    expect(await motionFailures(edited.new_code)).toEqual([]);
  }, 300_000);

  it('catches a travel limit that runs the carriage into the far stop', async () => {
    const code = inject(SOURCE, 'const travel = 72;', 'const travel = 80;');
    const failures = await motionFailures(code, [0, 80]);
    // At 80 mm the carriage ends at x = 119, 7 mm into the far stop; the
    // rest pose stays clear.
    expect(failures).toEqual([
      'review_cad not ok',
      'error assembly.pose-envelope.interference',
      'envelope clash at slide:max: rail/carriage',
      'mechanism verdict: broken',
    ]);
  }, 180_000);

  it('catches a channel narrower than the rail', async () => {
    const code = inject(SOURCE, 'railWidth.add(2 * clearance)', 'railWidth.subtract(2 * clearance)');
    // The fixture builds with validate: 'error', so the overlap stops the build.
    const failures = await motionFailures(code);
    expect(failures).toContain('review_cad not ok');
    expect(failures).toContain('error assembly.interference.overlap');
  }, 180_000);

  it('catches M4 clearance holes in place of M5', async () => {
    const code = inject(SOURCE, 'cylinder(20, 2.75)', 'cylinder(20, 2.25)');
    const failures = stepFailures(await exportSolids(code), DEFAULT_WIDTH);
    // Only the rail volume changes; every box stays the same.
    expect(failures.map((f) => f.split(':')[0])).toEqual(['rail volume rel. error']);
  }, 120_000);
});
