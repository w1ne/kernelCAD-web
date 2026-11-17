// tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts
//
// Manufacturing benchmark case 01 (#1227): a Pi 4 tray with four M3 bosses
// and a USB-C opening. The gates are the ones the issue requires, scored on
// real OCCT output rather than on a render:
//   1. evaluate succeeds with no error and no degraded feature;
//   2. the STEP export re-imports as one solid whose volume matches the
//      closed-form volume of the authored geometry;
//   3. the named interfaces (pilot-hole diameter, depth, pitch and mouth
//      height) are measured from the re-imported STEP, not from the source;
//   4. a Width edit through set_param's source rewrite recomputes, grows the
//      solid by exactly the width delta, and keeps the hole pattern centred
//      with the same pitch;
//   5. seeded defects (a moved boss, a missing USB-C opening) fail the gate.
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

const FIXTURE = join(__dirname, '../../fixtures/manufacturing/pcb-enclosure-m3.kcad.ts');
const SOURCE = readFileSync(FIXTURE, 'utf8');

interface TrayParams { width: number; depth: number; height: number; wall: number; floor: number }
const DEFAULTS: TrayParams = { width: 95, depth: 66, height: 25, wall: 2.5, floor: 2 };

/** Closed-form volume of the authored tray. */
function expectedVolume(p: TrayParams): number {
  const shell = p.width * p.depth * p.height
    - (p.width - 2 * p.wall) * (p.depth - 2 * p.wall) * (p.height - p.floor);
  const bosses = 4 * Math.PI * 3 ** 2 * 5;
  const pilots = 4 * Math.PI * 1.25 ** 2 * 4;
  const usbC = 9.4 * p.wall * 3.6;
  return shell + bosses - pilots - usbC;
}

async function buildAndReimport(code: string): Promise<StepSolidReport> {
  const evaluated = await evaluateScript({ code, scriptDir: join(__dirname, '../../fixtures/manufacturing') });
  expect(evaluated.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(evaluated.exitCode).toBe(0);
  expect(evaluated.featureHealth).toEqual([]);

  const exported = await runAndExport({ code, fileName: 'pcb-enclosure-m3.kcad.ts', format: 'step' });
  expect(exported.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const report = await inspectStepBuffer(Buffer.from(exported.bytes), 'pcb-enclosure-m3.step');
  expect(report.solidCount).toBe(1);
  return report.solids[0];
}

/** Every gate failure for `solid` against the authored tray `p`; [] is a pass. */
function trayFailures(solid: StepSolidReport, p: TrayParams): string[] {
  const failures: string[] = [];
  const check = (label: string, actual: number, expected: number, tol = 0.01) => {
    if (!(Math.abs(actual - expected) < tol)) failures.push(`${label}: ${actual} != ${expected}`);
  };
  const expected = expectedVolume(p);
  check('volume rel. error', Math.abs(solid.volumeMm3 - expected) / expected, 0, 1e-3);
  solid.bboxExact.min.forEach((v, i) => check(`bbox.min[${i}]`, v, 0));
  check('bbox.max x', solid.bboxExact.max[0], p.width);
  check('bbox.max y', solid.bboxExact.max[1], p.depth);
  check('bbox.max z', solid.bboxExact.max[2], p.height);

  const pilots = solid.holes.filter((h) => h.kind === 'blind' && Math.abs(h.diameterMm - 2.5) < 0.01);
  if (pilots.length !== 4) return [...failures, `pilot holes: ${pilots.length} != 4`];
  for (const h of pilots) {
    check('pilot depth', h.depthMm, 4);
    check('pilot mouth z', h.axisOrigin[2], p.floor + 5);
    check('pilot axis z', h.axisDirection[2], -1);
  }
  const xs = [...new Set(pilots.map((h) => Math.round(h.axisOrigin[0] * 100) / 100))].sort((a, b) => a - b);
  const ys = [...new Set(pilots.map((h) => Math.round(h.axisOrigin[1] * 100) / 100))].sort((a, b) => a - b);
  if (xs.length !== 2 || ys.length !== 2) return [...failures, `pilot pattern is not a rectangle: x ${xs}, y ${ys}`];
  check('pitch x', xs[1] - xs[0], 58);
  check('pitch y', ys[1] - ys[0], 49);
  check('pattern centre x', (xs[0] + xs[1]) / 2, p.width / 2);
  check('pattern centre y', (ys[0] + ys[1]) / 2, p.depth / 2);
  return failures;
}

/** Apply a literal source edit that must match exactly once. */
function inject(code: string, from: string, to: string): string {
  expect(code.split(from)).toHaveLength(2);
  return code.replace(from, to);
}

describe('manufacturing benchmark 01: Pi 4 tray with M3 bosses and USB-C opening (#1227)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('re-imports from STEP as one solid with the closed-form volume and the authored interfaces', async () => {
    expect(trayFailures(await buildAndReimport(SOURCE), DEFAULTS)).toEqual([]);
  }, 120_000);

  it('a Width edit grows the solid by the width delta and keeps the hole pattern centred', async () => {
    const edited = setParamValue(SOURCE, 'Width', 120);
    if (!edited.ok) throw new Error(edited.error);
    const solid = await buildAndReimport(edited.new_code);
    expect(trayFailures(solid, { ...DEFAULTS, width: 120 })).toEqual([]);
  }, 120_000);

  it('catches a boss moved off the 58 mm pitch', async () => {
    const code = inject(SOURCE, '[[-29, -24.5], [29, -24.5]', '[[-29, -24.5], [30, -24.5]');
    const failures = trayFailures(await buildAndReimport(code), DEFAULTS);
    expect(failures.some((f) => f.startsWith('pilot pattern is not a rectangle'))).toBe(true);
  }, 120_000);

  it('catches a missing USB-C opening by volume', async () => {
    const code = inject(SOURCE, 'return body.subtract(usbC);', 'return body;');
    const failures = trayFailures(await buildAndReimport(code), DEFAULTS);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/^volume rel\. error/);
  }, 120_000);
});
