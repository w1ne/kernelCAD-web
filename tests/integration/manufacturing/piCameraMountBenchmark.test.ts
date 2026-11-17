// tests/integration/manufacturing/piCameraMountBenchmark.test.ts
//
// Manufacturing benchmark case 04 (#1227): a robot-camera adapter mount that
// holds a Raspberry Pi Camera Module on a 2020 extrusion. Following the
// 9 Nov scope update, pose is scored ahead of everything else and each gate
// is scored on its own:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. per-part pose: solve_mates puts the mount and the camera board at
//      their expected world translation with no rotation;
//   3. interference: review_cad finds no clash between the board and the
//      bracket. Motion is not applicable: the only mate is fastened;
//   4. the STEP export re-imports as two solids whose volumes match the
//      closed-form volume of each part; the named interfaces (M5 base pair,
//      M2 clearance pattern, board holes) are measured from the STEP, and the
//      board holes are coaxial with the bracket holes;
//   5. a PatternHeight edit through set_param's source rewrite raises the
//      pattern and the board together and stays clash-free;
//   6. seeded defects (M2 tap-drill holes, a bracket pattern off the board
//      holes, a board pushed into the standoffs) fail. The last two are
//      caught by the build itself: the fastened mate rejects off-axis holes
//      and overlapping parts at the contact face.
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

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/pi-camera-mount.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

const DEFAULT_HEIGHT = 30;

/** World position of the `camera` connector: standoff faces, pattern centre. */
const seatOf = (h: number): [number, number, number] => [20, -2, h];

/** Closed-form volume of each authored part. */
function expectedVolumes(h: number): Record<'mount' | 'camera', number> {
  const plates = 40 * 20 * 4 + 40 * 4 * (h + 10) - 40 * 4 * 4;
  const standoffs = 4 * Math.PI * 2.5 ** 2 * 2;
  const holes = 4 * Math.PI * 1.2 ** 2 * 6 + 2 * Math.PI * 2.75 ** 2 * 4;
  return {
    mount: plates + standoffs - holes,
    camera: 25 * 1 * 23.86 - 4 * Math.PI * 1.1 ** 2 * 1,
  };
}

async function evaluateClean(code: string): Promise<void> {
  const evaluated = await evaluateScript({ code, scriptDir: join(__dirname, '../../fixtures/manufacturing') });
  expect(evaluated.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(evaluated.exitCode).toBe(0);
  expect(evaluated.featureHealth).toEqual([]);
}

/** Every pose failure; [] is a pass. */
async function poseFailures(code: string, h: number): Promise<string[]> {
  const ev = await evaluateScriptTool({ code });
  if (!ev.ok) return [`evaluate_script failed`];
  const solved = await solveMatesTool({});
  if (!solved.ok) return [`solve_mates failed: ${solved.error}`];
  if (solved.status !== 'solved') return [`solve_mates status: ${solved.status}`];
  const failures: string[] = [];
  const seat = seatOf(h);
  for (const part of ['mount', 'camera']) {
    const pose = solved.poses[part];
    if (!pose) { failures.push(`${part}: no pose`); continue; }
    pose.translation.forEach((v, i) => {
      if (!(Math.abs(v - seat[i]) < 1e-6)) failures.push(`${part} translation[${i}]: ${v} != ${seat[i]}`);
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
  const exported = await runAndExport({ code, fileName: 'pi-camera-mount.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'pi-camera-mount.step');
  return report.solids;
}

const round = (v: number) => Math.round(v * 100) / 100;
const distinct = (vs: number[]) => [...new Set(vs.map(round))].sort((a, b) => a - b);

/** Every STEP failure for the exported solids against PatternHeight `h`; [] is a pass. */
function stepFailures(solids: StepSolidReport[], h: number): string[] {
  if (solids.length !== 2) return [`solids: ${solids.length} != 2`];
  const failures: string[] = [];
  const check = (label: string, actual: number, expected: number, tol = 0.01) => {
    if (!(Math.abs(actual - expected) < tol)) failures.push(`${label}: ${actual} != ${expected}`);
  };
  // The STEP solids carry no part names; the bracket is the larger one.
  const [mount, camera] = [...solids].sort((a, b) => b.volumeMm3 - a.volumeMm3);
  const volumes = expectedVolumes(h);
  check('mount volume rel. error', Math.abs(mount.volumeMm3 - volumes.mount) / volumes.mount, 0, 1e-3);
  check('camera volume rel. error', Math.abs(camera.volumeMm3 - volumes.camera) / volumes.camera, 0, 1e-3);

  [0, -2, 0].forEach((v, i) => check(`mount bbox.min[${i}]`, mount.bboxExact.min[i], v));
  [40, 20, h + 10].forEach((v, i) => check(`mount bbox.max[${i}]`, mount.bboxExact.max[i], v));
  [7.5, -3, h - 8.25].forEach((v, i) => check(`camera bbox.min[${i}]`, camera.bboxExact.min[i], v));
  [32.5, -2, h + 15.61].forEach((v, i) => check(`camera bbox.max[${i}]`, camera.bboxExact.max[i], v));

  const holesOf = (solid: StepSolidReport, diameter: number, axis: 1 | 2) => solid.holes.filter((hole) =>
    Math.abs(hole.diameterMm - diameter) < 0.01 && Math.abs(Math.abs(hole.axisDirection[axis]) - 1) < 1e-6);

  const m5 = holesOf(mount, 5.5, 2);
  if (m5.length !== 2) return [...failures, `M5 base holes: ${m5.length} != 2`];
  for (const hole of m5) {
    check('M5 depth', hole.depthMm, 4);
    if (hole.kind !== 'through') failures.push(`M5 kind: ${hole.kind}`);
    check('M5 y', hole.axisOrigin[1], 10);
  }
  const bx = distinct(m5.map((hole) => hole.axisOrigin[0]));
  if (bx.length !== 2) return [...failures, `M5 holes share x: ${bx}`];
  check('M5 pitch', bx[1] - bx[0], 20);
  check('M5 centre x', (bx[0] + bx[1]) / 2, 20);

  // Each pattern must be 21 x 12.5 mm about (20, h), through its own part.
  const pattern = (label: string, found: StepSolidReport['holes'], depth: number) => {
    if (found.length !== 4) { failures.push(`${label} holes: ${found.length} != 4`); return; }
    for (const hole of found) {
      check(`${label} depth`, hole.depthMm, depth);
      if (hole.kind !== 'through') failures.push(`${label} kind: ${hole.kind}`);
    }
    const xs = distinct(found.map((hole) => hole.axisOrigin[0]));
    const zs = distinct(found.map((hole) => hole.axisOrigin[2]));
    if (xs.length !== 2 || zs.length !== 2) { failures.push(`${label} pattern is not a rectangle: x ${xs}, z ${zs}`); return; }
    check(`${label} pitch x`, xs[1] - xs[0], 21);
    check(`${label} pitch z`, zs[1] - zs[0], 12.5);
    check(`${label} centre x`, (xs[0] + xs[1]) / 2, 20);
    check(`${label} centre z`, (zs[0] + zs[1]) / 2, h);
  };
  const m2 = holesOf(mount, 2.4, 1);
  const boardHoles = holesOf(camera, 2.2, 1);
  pattern('M2 clearance', m2, 6);
  pattern('board', boardHoles, 1);
  // Every board hole must sit on a bracket hole axis, so the screws go in.
  for (const hole of boardHoles) {
    const onAxis = m2.some((c) => Math.abs(c.axisOrigin[0] - hole.axisOrigin[0]) < 0.01
      && Math.abs(c.axisOrigin[2] - hole.axisOrigin[2]) < 0.01);
    if (!onAxis) failures.push(`board hole at x ${round(hole.axisOrigin[0])}, z ${round(hole.axisOrigin[2])} has no bracket hole`);
  }
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 04: Pi camera extrusion mount (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('evaluates with no error and no degraded feature', async () => {
    await evaluateClean(SOURCE);
  }, 120_000);

  it('puts the mount and the camera board at their expected poses', async () => {
    expect(await poseFailures(SOURCE, DEFAULT_HEIGHT)).toEqual([]);
  }, 120_000);

  it('seats the board on the standoffs with no clash', async () => {
    expect(await clashFailures(SOURCE)).toEqual([]);
  }, 180_000);

  it('re-imports from STEP as two solids with closed-form volumes and coaxial camera holes', async () => {
    expect(stepFailures(await exportSolids(SOURCE), DEFAULT_HEIGHT)).toEqual([]);
  }, 120_000);

  it('a PatternHeight edit raises the pattern and the board together and stays clash-free', async () => {
    const edited = setParamValue(SOURCE, 'PatternHeight', 45);
    if (!edited.ok) throw new Error(edited.error);
    await evaluateClean(edited.new_code);
    expect(await poseFailures(edited.new_code, 45)).toEqual([]);
    expect(stepFailures(await exportSolids(edited.new_code), 45)).toEqual([]);
    expect(await clashFailures(edited.new_code)).toEqual([]);
  }, 300_000);

  it('catches M2 tap-drill holes where the board screws need clearance', async () => {
    const code = inject(SOURCE, 'alongY(8, 1.2)', 'alongY(8, 0.8)');
    const failures = stepFailures(await exportSolids(code), DEFAULT_HEIGHT);
    expect(failures).toContain('M2 clearance holes: 0 != 4');
  }, 120_000);

  it('catches a bracket hole pattern drilled off the board holes', async () => {
    const code = inject(SOURCE, 'translate(20 + dx, -3,', 'translate(20.5 + dx, -3,');
    // The fastened mate checks that a screw passes through both parts.
    const review = await reviewCadTool({ code, includeInterference: true });
    expect(review.ok).toBe(false);
    const errors = review.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toEqual(['feature.invalid-args']);
    expect(errors[0].message).toMatch(/0\.5 mm off-axis/);
  }, 120_000);

  it('catches a board pushed into the standoffs', async () => {
    const code = inject(SOURCE, 'box(25, 1, 23.86).translate(-12.5, -1, -8.25)', 'box(25, 1, 23.86).translate(-12.5, -0.5, -8.25)');
    // The fixture builds with validate: 'error', so the overlap stops the build.
    const failures = await clashFailures(code);
    expect(failures).toContain('review_cad not ok');
    expect(failures).toContain('error assembly.interference.overlap');
  }, 180_000);
});
