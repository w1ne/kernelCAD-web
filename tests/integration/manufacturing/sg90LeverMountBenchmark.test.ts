// tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts
//
// Manufacturing benchmark case 08 (#1227): an SG90 servo lever on a printed
// mounting plate. The servo and horn are the hash-pinned community STEP
// files, so this case checks a purchased part, a fastened mate and a
// revolute mate together. Following the 9 Nov scope update, pose is scored
// ahead of everything else and each gate is scored on its own:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. per-part pose: solve_mates keeps the servo and plate at the origin
//      and only turns the arm about the shaft axis, at 0, 90 and 180 degrees;
//   3. interference and motion: review_cad finds no clash at rest, and its
//      pose envelope really sampled both swing limits with no clash;
//   4. the STEP export re-imports as three solids whose volumes and boxes
//      match: closed form for the plate and the lever, the pinned STEP
//      volumes for the servo and the horn;
//   5. a LeverReach edit through set_param's source rewrite lengthens the
//      lever and stays clash-free over the swing;
//   6. seeded defects (the horn pressed 1 mm onto the gear housing, a pocket
//      narrower than the servo body, M1.6 holes in place of M2 clearance,
//      a missing revolute mate that leaves the arm disconnected, and a
//      fastened mate on the axis connectors) fail. The pocket and wrong-mate
//      defects are caught by the build itself.
// Not verified: SG90 supplier variant, spline engagement, screws, stall
// torque. Ear-hole centers are checked separately from volume and boxes so
// translating a clearance hole without changing either cannot false-pass.
// Tolerances are this fixture's own: 0.1 % on volume, 0.01 mm on positions,
// and 1e-6 mm / 1e-6 degrees on solver poses.
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

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/sg90-lever-mount.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

const DEFAULT_REACH = 50;
const SWING = 180;
/** World z of the shaft tip, where the arm frame sits. */
const SHAFT_TIP_Z = 29.9;
/** Volumes of the pinned STEP files (assets/reference-parts/sg90/sha256.json). */
const SERVO_VOLUME = 6809.9597;
const HORN_VOLUME = 268.0050;

type PartName = 'servo' | 'plate' | 'arm';

/** Volume of each part: closed form for the printed geometry. */
function expectedVolumes(reach: number): Record<PartName, number> {
  const pocket = (11.8 + 0.6) * (22.5 + 0.6) * 4;
  const leverHoles = Math.PI * (2.5 ** 2 + 2 * 0.7 ** 2 + 1.5 ** 2) * 3;
  return {
    servo: SERVO_VOLUME,
    plate: 24 * 46 * 4 - pocket - 2 * Math.PI * 1.2 ** 2 * 4,
    arm: HORN_VOLUME + (reach + 12) * 10 * 3 - leverHoles,
  };
}

async function evaluateClean(code: string): Promise<void> {
  const evaluated = await evaluateScript({ code, scriptDir: join(__dirname, '../../fixtures/manufacturing') });
  expect(evaluated.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(evaluated.exitCode).toBe(0);
  expect(evaluated.featureHealth).toEqual([]);
}

/** Every pose failure at swing angle `deg`; [] is a pass. */
async function poseFailures(code: string, deg: number, skipMechanismCheck = false): Promise<string[]> {
  const ev = await evaluateScriptTool({ code, skipMechanismCheck });
  if (!ev.ok) return [`evaluate_script failed`];
  const solved = await solveMatesTool({ poses: { swing: deg } });
  if (!solved.ok) return [`solve_mates failed: ${solved.error}`];
  if (solved.status !== 'solved') return [`solve_mates status: ${solved.status}`];
  const expected: Record<PartName, { at: [number, number, number]; deg: number }> = {
    servo: { at: [0, 0, 0], deg: 0 },
    plate: { at: [0, 0, 0], deg: 0 },
    arm: { at: [0, 0, SHAFT_TIP_Z], deg },
  };
  const failures: string[] = [];
  for (const [part, want] of Object.entries(expected)) {
    const pose = solved.poses[part];
    if (!pose) { failures.push(`${part}: no pose`); continue; }
    pose.translation.forEach((v, i) => {
      if (!(Math.abs(v - want.at[i]) < 1e-6)) failures.push(`${part} translation[${i}]: ${v} != ${want.at[i]}`);
    });
    if (!(Math.abs(pose.rotateDeg - want.deg) < 1e-6)) failures.push(`${part} rotation: ${pose.rotateDeg} != ${want.deg}`);
    if (want.deg !== 0 && JSON.stringify(pose.rotateAxis) !== '[0,0,1]') failures.push(`${part} axis: ${pose.rotateAxis}`);
  }
  return failures;
}

/** Every interference or motion failure from review_cad; [] is a pass. */
async function motionFailures(code: string): Promise<string[]> {
  const review = await reviewCadTool({ code, includeInterference: true, includePoseEnvelope: true });
  const failures: string[] = [];
  if (!review.ok) failures.push('review_cad not ok');
  for (const d of review.diagnostics) {
    if (d.severity === 'error') failures.push(`error ${d.code}`);
  }
  for (const pair of review.rawInterferencePairs ?? []) failures.push(`interference: ${pair.a}/${pair.b}`);
  const envelope = review.poseEnvelope;
  if (!envelope) return [...failures, 'no pose envelope'];
  const sampled = envelope.samples.map((s) => s.poses.swing).filter((v) => v !== undefined).sort((a, b) => a - b);
  if (JSON.stringify(sampled) !== JSON.stringify([0, SWING])) failures.push(`swing samples: ${sampled} != 0,${SWING}`);
  for (const pair of envelope.interferencePairs) failures.push(`envelope clash at ${pair.sampleName}: ${pair.a}/${pair.b}`);
  if (review.mechanismSummary?.verdict !== 'real') failures.push(`mechanism verdict: ${review.mechanismSummary?.verdict}`);
  return failures;
}

async function exportSolids(code: string): Promise<StepSolidReport[]> {
  const exported = await runAndExport({ code, fileName: 'sg90-lever-mount.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'sg90-lever-mount.step');
  return report.solids;
}

/** Every STEP failure for the exported solids against LeverReach `reach` at rest; [] is a pass. */
function stepFailures(solids: StepSolidReport[], reach: number): string[] {
  if (solids.length !== 3) return [`solids: ${solids.length} != 3`];
  const failures: string[] = [];
  const check = (label: string, actual: number, expected: number, tol = 0.01) => {
    if (!(Math.abs(actual - expected) < tol)) failures.push(`${label}: ${actual} != ${expected}`);
  };
  // The STEP solids carry no part names; the box minimum z tells them apart.
  const byMinZ = [...solids].sort((a, b) => a.bboxExact.min[2] - b.bboxExact.min[2]);
  const parts: Record<PartName, StepSolidReport> = { servo: byMinZ[0], plate: byMinZ[1], arm: byMinZ[2] };
  const volumes = expectedVolumes(reach);
  for (const name of ['servo', 'plate', 'arm'] as const) {
    check(`${name} volume rel. error`, Math.abs(parts[name].volumeMm3 - volumes[name]) / volumes[name], 0, 1e-3);
  }
  const boxes: Record<PartName, [number[], number[]]> = {
    servo: [[-5.9, -21.3, 0], [5.9, 11.1, 29.9]],
    plate: [[-12, -28, 11.9], [12, 18, 15.9]],
    arm: [[-6, -5, 27], [reach + 6, 5, 35]],
  };
  for (const name of ['servo', 'plate', 'arm'] as const) {
    boxes[name][0].forEach((v, i) => check(`${name} bbox.min[${i}]`, parts[name].bboxExact.min[i], v));
    boxes[name][1].forEach((v, i) => check(`${name} bbox.max[${i}]`, parts[name].bboxExact.max[i], v));
  }
  return failures;
}

/** Check the plate's two M2 ear-hole axes against the authored interface. */
function earHoleFailures(solids: StepSolidReport[]): string[] {
  if (solids.length !== 3) return [`solids: ${solids.length} != 3`];
  const plate = [...solids].sort((a, b) => a.bboxExact.min[2] - b.bboxExact.min[2])[1];
  const holes = plate.holes.filter((hole) =>
    Math.abs(hole.diameterMm - 2.4) < 0.05 && Math.abs(Math.abs(hole.axisDirection[2]) - 1) < 1e-6,
  );
  const expectedCenters: Array<[number, number]> = [[0, -18.95], [0, 8.25]];
  const failures: string[] = [];
  if (holes.length !== expectedCenters.length) {
    failures.push(`M2 ear holes: ${holes.length} != ${expectedCenters.length}`);
  }
  for (const [x, y] of expectedCenters) {
    const matchingHole = holes.find((hole) =>
      Math.hypot(hole.axisOrigin[0] - x, hole.axisOrigin[1] - y) < 0.01,
    );
    if (!matchingHole) failures.push(`missing M2 ear-hole axis at (${x}, ${y})`);
  }
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 08: SG90 servo lever on a printed plate (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('evaluates with no error and no degraded feature', async () => {
    await evaluateClean(SOURCE);
  }, 120_000);

  it.each([0, SWING / 2, SWING])('keeps the servo and plate fixed and turns only the arm about the shaft at swing = %d degrees', async (deg) => {
    expect(await poseFailures(SOURCE, deg)).toEqual([]);
  }, 120_000);

  it('swings the full range without touching the servo or the plate', async () => {
    expect(await motionFailures(SOURCE)).toEqual([]);
  }, 180_000);

  it('re-imports from STEP as three solids with the expected volumes and boxes', async () => {
    const solids = await exportSolids(SOURCE);
    expect(stepFailures(solids, DEFAULT_REACH)).toEqual([]);
    expect(earHoleFailures(solids)).toEqual([]);
  }, 120_000);

  it('rejects a flipped servo body even when mate poses alone still pass', async () => {
    const code = inject(SOURCE, 'const servo = await lib.standard.sg90();',
      'const servo = (await lib.standard.sg90()).rotate([1, 0, 0], 180);');

    // The declared joint frames are unchanged, so solve_mates alone cannot
    // see that the imported servo geometry was turned over in its local frame.
    expect(await poseFailures(code, 0, true)).toEqual([]);

    // The full mechanism gate must reject the geometry-to-mate mismatch even
    // though the authored mate graph still solves to the expected transforms.
    const evaluated = await evaluateScriptTool({ code });
    expect(evaluated.ok).toBe(false);
    expect(evaluated.mechanism).toBe('broken');
    const codes = evaluated.diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toContain('mechanism.joint-mesh-gap');
    expect(codes).toContain('assembly.mechanical.connector-not-in-solid');
  }, 180_000);

  it('catches a missing revolute mate that strands the servo arm', async () => {
    const code = inject(SOURCE,
      "mount.mate('swing', 'servo.shaft', 'arm.hub', 'revolute', { limitsDeg: [0, 180] });\n",
      '');

    // The shapes and fixed servo/plate mate remain valid; the independently
    // authored arm must not be accepted as a mechanism after its drive mate is
    // removed from the graph.
    const evaluated = await evaluateScriptTool({ code });
    expect(evaluated.ok).toBe(false);
    expect(evaluated.mechanism).toBe('broken');
    expect(evaluated.diagnostics.map((diagnostic) => diagnostic.code)).toContain('mechanism.orphan-part');
  }, 180_000);

  it('rejects a fastened mate substituted for the actuated swing', async () => {
    const code = inject(SOURCE,
      "mount.mate('swing', 'servo.shaft', 'arm.hub', 'revolute', { limitsDeg: [0, 180] });",
      "mount.mate('swing', 'servo.shaft', 'arm.hub', 'fastened');");
    const evaluated = await evaluateScriptTool({ code });
    expect(evaluated.ok).toBe(false);
    const error = evaluated.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
    expect(error?.code).toBe('feature.invalid-args');
    expect(error?.message).toMatch(/'servo\.shaft' is a 'axis' connector.*'arm\.hub' is a 'axis' one/);
    expect(error?.message).toMatch(/'fastened' two 'frame'/);
  }, 180_000);

  it('a LeverReach edit lengthens the lever and stays clash-free', async () => {
    const edited = setParamValue(SOURCE, 'LeverReach', 75);
    if (!edited.ok) throw new Error(edited.error);
    await evaluateClean(edited.new_code);
    expect(await poseFailures(edited.new_code, SWING)).toEqual([]);
    expect(stepFailures(await exportSolids(edited.new_code), 75)).toEqual([]);
    expect(await motionFailures(edited.new_code)).toEqual([]);
  }, 300_000);

  it('catches a horn pressed 1 mm onto the gear housing', async () => {
    const code = inject(SOURCE, 'const socketOpeningZ = 27.0;', 'const socketOpeningZ = 26.0;');
    const failures = await motionFailures(code);
    expect(failures).toContain('review_cad not ok');
    expect(failures).toContain('error assembly.interference.overlap');
  }, 180_000);

  it('catches a pocket narrower than the servo body', async () => {
    const code = inject(SOURCE, 'const pocketClearance = 0.3;', 'const pocketClearance = -0.3;');
    // The fixture builds with validate: 'error', so the overlap stops the build.
    const failures = await motionFailures(code);
    expect(failures).toContain('review_cad not ok');
    expect(failures).toContain('error assembly.interference.overlap');
  }, 180_000);

  it('catches M1.6 holes in place of M2 clearance', async () => {
    const code = inject(SOURCE, 'cylinder(20, 1.2)', 'cylinder(20, 0.8)');
    const failures = stepFailures(await exportSolids(code), DEFAULT_REACH);
    // Only the plate volume changes; every box stays the same.
    expect(failures.map((f) => f.split(':')[0])).toEqual(['plate volume rel. error']);
  }, 120_000);

  it('catches an ear hole moved off its authored shaft axis', async () => {
    const code = inject(SOURCE,
      'm2Clearance.translate(0, -18.95, 0)',
      'm2Clearance.translate(0, -17.95, 0)');
    const solids = await exportSolids(code);

    // The existing volume and bounding-box oracle cannot see a translated
    // cylindrical cut. The independent interface check must still reject it.
    expect(stepFailures(solids, DEFAULT_REACH)).toEqual([]);
    expect(earHoleFailures(solids)).toContain('missing M2 ear-hole axis at (0, -18.95)');
  }, 120_000);
});
