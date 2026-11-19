// tests/integration/manufacturing/nema17BracketBenchmark.test.ts
//
// Manufacturing benchmark case 02 (#1227): a CNC L-bracket for a NEMA 17
// stepper. The gates are the ones the issue requires, scored on real OCCT
// output rather than on a render:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. the STEP export re-imports as one solid whose volume matches the
//      closed-form volume of the authored geometry;
//   3. the named interfaces (pilot bore, M3 square, M5 base pair: diameter,
//      axis, through-length and position) are measured from the re-imported
//      STEP, not from the source;
//   4. a Width edit through set_param's source rewrite recomputes, grows the
//      solid by exactly the width delta, and keeps the motor and base holes
//      centred with the same pitch;
//   5. seeded defects (M3 tap-drill size instead of clearance, a motor
//      pattern shifted off the bore) fail the gate.
// Tolerances are this fixture's own: 0.1 % on volume (exact B-rep faces) and
// 0.01 mm on positions and diameters.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScript } from '../../../src/composition/scriptEvaluation';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { inspectStepBuffer, type StepSolidReport } from '../../../src/kernel/import/inspectStep';
import { setParamValue } from '../../../src/modeling/edits/setParamValue';

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/nema17-l-bracket.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

interface BracketParams { width: number; baseDepth: number; height: number; thickness: number }
const DEFAULTS: BracketParams = { width: 60, baseDepth: 40, height: 50, thickness: 5 };

/** Closed-form volume of the authored bracket. */
function expectedVolume(p: BracketParams): number {
  const plates = p.width * p.baseDepth * p.thickness + p.width * p.thickness * (p.height - p.thickness);
  const holes = Math.PI * (11.25 ** 2 + 4 * 1.7 ** 2 + 2 * 2.75 ** 2) * p.thickness;
  return plates - holes;
}

async function buildAndReimport(code: string): Promise<StepSolidReport> {
  const evaluated = await evaluateScript({ code, scriptDir: join(__dirname, '../../fixtures/manufacturing') });
  expect(evaluated.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(evaluated.exitCode).toBe(0);
  expect(evaluated.featureHealth).toEqual([]);

  const exported = await runAndExport({ code, fileName: 'nema17-l-bracket.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'nema17-l-bracket.step');
  expect(report.solidCount).toBe(1);
  return report.solids[0];
}

const round = (v: number) => Math.round(v * 100) / 100;
const distinct = (vs: number[]) => [...new Set(vs.map(round))].sort((a, b) => a - b);

/** Every gate failure for `solid` against the authored bracket `p`; [] is a pass. */
function bracketFailures(solid: StepSolidReport, p: BracketParams): string[] {
  const failures: string[] = [];
  const check = (label: string, actual: number, expected: number, tol = 0.01) => {
    if (!(Math.abs(actual - expected) < tol)) failures.push(`${label}: ${actual} != ${expected}`);
  };
  const expected = expectedVolume(p);
  check('volume rel. error', Math.abs(solid.volumeMm3 - expected) / expected, 0, 1e-3);
  solid.bboxExact.min.forEach((v, i) => check(`bbox.min[${i}]`, v, 0));
  check('bbox.max x', solid.bboxExact.max[0], p.width);
  check('bbox.max y', solid.bboxExact.max[1], p.baseDepth);
  check('bbox.max z', solid.bboxExact.max[2], p.height);

  const holesOf = (diameter: number, axis: 1 | 2) => solid.holes.filter((h) =>
    Math.abs(h.diameterMm - diameter) < 0.01 && Math.abs(Math.abs(h.axisDirection[axis]) - 1) < 1e-6);
  const cx = p.width / 2;
  const motorZ = p.thickness + 23;

  const bores = holesOf(22.5, 1);
  if (bores.length !== 1) return [...failures, `pilot bores: ${bores.length} != 1`];
  check('bore depth', bores[0].depthMm, p.thickness);
  if (bores[0].kind !== 'through') failures.push(`bore kind: ${bores[0].kind}`);
  check('bore centre x', bores[0].axisOrigin[0], cx);
  check('bore centre z', bores[0].axisOrigin[2], motorZ);

  const m3 = holesOf(3.4, 1);
  if (m3.length !== 4) return [...failures, `M3 clearance holes: ${m3.length} != 4`];
  for (const h of m3) {
    check('M3 depth', h.depthMm, p.thickness);
    if (h.kind !== 'through') failures.push(`M3 kind: ${h.kind}`);
  }
  const mx = distinct(m3.map((h) => h.axisOrigin[0]));
  const mz = distinct(m3.map((h) => h.axisOrigin[2]));
  if (mx.length !== 2 || mz.length !== 2) return [...failures, `M3 pattern is not a square: x ${mx}, z ${mz}`];
  check('M3 pitch x', mx[1] - mx[0], 31);
  check('M3 pitch z', mz[1] - mz[0], 31);
  check('M3 centre x', (mx[0] + mx[1]) / 2, cx);
  check('M3 centre z', (mz[0] + mz[1]) / 2, motorZ);

  const m5 = holesOf(5.5, 2);
  if (m5.length !== 2) return [...failures, `M5 base holes: ${m5.length} != 2`];
  for (const h of m5) {
    check('M5 depth', h.depthMm, p.thickness);
    if (h.kind !== 'through') failures.push(`M5 kind: ${h.kind}`);
    check('M5 y', h.axisOrigin[1], p.thickness + (p.baseDepth - p.thickness) / 2);
  }
  const bx = distinct(m5.map((h) => h.axisOrigin[0]));
  if (bx.length !== 2) return [...failures, `M5 holes share x: ${bx}`];
  check('M5 pitch', bx[1] - bx[0], 40);
  check('M5 centre x', (bx[0] + bx[1]) / 2, cx);
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 02: NEMA 17 CNC L-bracket (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('re-imports from STEP as one solid with the closed-form volume and the authored interfaces', async () => {
    expect(bracketFailures(await buildAndReimport(SOURCE), DEFAULTS)).toEqual([]);
  }, 120_000);

  it('a Width edit grows the solid by the width delta and keeps the motor and base holes centred', async () => {
    const edited = setParamValue(SOURCE, 'Width', 80);
    if (!edited.ok) throw new Error(edited.error);
    const solid = await buildAndReimport(edited.new_code);
    expect(bracketFailures(solid, { ...DEFAULTS, width: 80 })).toEqual([]);
  }, 120_000);

  it('catches base holes left at the default flange depth after a BaseDepth edit', async () => {
    const edited = setParamValue(SOURCE, 'BaseDepth', 60);
    if (!edited.ok) throw new Error(edited.error);
    const stale = inject(
      edited.new_code,
      'const baseHoleY = thickness.add(baseDepth.subtract(thickness).divide(2));',
      'const baseHoleY = 22.5;',
    );
    const failures = bracketFailures(await buildAndReimport(stale), { ...DEFAULTS, baseDepth: 60 });

    // A stale 22.5 mm coordinate still cuts valid through-holes and leaves
    // volume and bounds unchanged. The STEP interface oracle must catch that
    // both holes missed the new 32.5 mm flange midpoint.
    expect(failures).toHaveLength(2);
    expect(failures).toEqual(['M5 y: 22.5 != 32.5', 'M5 y: 22.5 != 32.5']);
  }, 120_000);

  it('catches M3 tap-drill holes where the motor needs clearance holes', async () => {
    const code = inject(SOURCE, 'throughUpright(1.7)', 'throughUpright(1.25)');
    const failures = bracketFailures(await buildAndReimport(code), DEFAULTS);
    expect(failures.some((f) => f.startsWith('M3 clearance holes: 0 != 4'))).toBe(true);
  }, 120_000);

  it('catches a motor pattern shifted off the pilot bore', async () => {
    const code = inject(SOURCE, 'translate(cx.add(dx), -1, motorZ.add(dz))', 'translate(cx.add(dx + 1), -1, motorZ.add(dz))');
    const failures = bracketFailures(await buildAndReimport(code), DEFAULTS);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/^M3 centre x: 31(\.\d+)? != 30$/);
  }, 120_000);

  it('catches one M5 base hole shifted off the 40 mm mounting pitch', async () => {
    const code = inject(SOURCE, 'for (const dx of [-20, 20]) {', 'for (const dx of [-20, 21]) {');
    const failures = bracketFailures(await buildAndReimport(code), DEFAULTS);

    // A hole moving within the base leaves the solid volume and outer box
    // unchanged, so the interface oracle must catch its 41 mm pitch and
    // 0.5 mm center shift independently.
    expect(failures).toHaveLength(2);
    expect(failures.map((failure) => failure.split(':')[0])).toEqual(['M5 pitch', 'M5 centre x']);
    expect(failures[0]).toMatch(/^M5 pitch: 41(\.\d+)? != 40$/);
    expect(failures[1]).toMatch(/^M5 centre x: 30\.5 != 30$/);
  }, 120_000);

  it('catches the M5 base pair shifted together while preserving its 40 mm pitch', async () => {
    const code = inject(SOURCE, 'for (const dx of [-20, 20]) {', 'for (const dx of [-19, 21]) {');
    const failures = bracketFailures(await buildAndReimport(code), DEFAULTS);

    // This defect preserves the pair's pitch, the solid volume and the outer
    // box, so the independent centerline check must catch the +1 mm shift.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/^M5 centre x: 31 != 30$/);
  }, 120_000);
});
