// tests/integration/dfm/carouselTruthSet.test.ts
//
// W3 Task 9 — carousel truth set: the DFM gates run against the REAL
// spice-carousel fixtures (v7.3 = pre-fix regressions, v7.6.1 = the shipped
// print) and must reproduce the known evidence picture exactly.
//
// The wall gate's acceptance signal is the SLIT DELTA: v7.3's skirt carries
// a zero-wall authoring slit (thinnest < 0.01 mm) that v7.6.1 removed
// (thinnest > 0.02 mm). Everything else thin in v7.6.1 is persistent design
// state — pinned descriptively below, never asserted away.
//
// Truncation safety: MinWallResult.violations caps at MAX_REPORTED_CLUSTERS
// (base + skirt reports come back truncated:true on these fixtures), so
// per-part `thinnestMm` (a global min, cap-independent) is safe to assert;
// "no cluster ≥ X" style assertions are NOT and are deliberately absent.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import {
  evaluateAndBuildScript,
  type EvaluateAndBuildResult,
} from '../../../src/agent/cli/commands/evaluate';
import type { DfmCheckReport } from '../../../src/modeling/runtime/dfm/runDfmChecks';
import { measureMachineFactor } from './machineFactor';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const V73 = resolve('tests/fixtures/print-prep/spice-carousel-v7.3.kcad.ts');
const V761 = resolve('tests/fixtures/print-prep/spice-carousel-v7.6.1.kcad.ts');

let prevValidateDefault: string | undefined;
let r73: EvaluateAndBuildResult;
let r761: EvaluateAndBuildResult;
let report73: DfmCheckReport;
let report761: DfmCheckReport;

const wallFor = (report: DfmCheckReport, part: string) =>
  report.walls.find(w => w.part === part)?.result;
const violatedPairs = (report: DfmCheckReport) =>
  report.clearance.filter(c => c.status === 'violated');

beforeAll(async () => {
  // The carousel fixtures carry design-intent near-touch interfaces that
  // the capture-time validity gate flags; keep that gate non-fatal so the
  // DFM gates — the subject under test — run and own the verdict.
  prevValidateDefault = process.env.KERNELCAD_VALIDATE_DEFAULT;
  process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
  await initOcct();
  // Build + gate each fixture ONCE (30–90 s each); every test below reads
  // these shared results. evaluateScript(input) is literally
  // evaluateAndBuildScript(input).evaluation, so `r761.evaluation` IS the
  // end-to-end `kernelcad evaluate` outcome for the wiring test.
  r73 = await evaluateAndBuildScript({ file: V73 });
  r761 = await evaluateAndBuildScript({ file: V761 });
  expect(r73.dfmReport).toBeDefined();
  expect(r761.dfmReport).toBeDefined();
  report73 = r73.dfmReport!;
  report761 = r761.dfmReport!;
});

afterAll(() => {
  if (prevValidateDefault === undefined) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
  else process.env.KERNELCAD_VALIDATE_DEFAULT = prevValidateDefault;
});

describe('carousel v7.3 — every known regression is caught (strict)', () => {
  it('wall gate catches the zero-wall skirt slit (thinnest < 0.01 mm)', () => {
    const skirt = wallFor(report73, 'skirt');
    expect(skirt).toBeDefined();
    expect(skirt!.thinnestMm).toBeLessThan(0.01);
    const thin = r73.evaluation.diagnostics.filter(d => d.code === 'dfm.wall.too-thin');
    expect(thin.length).toBeGreaterThan(0);
    expect(thin.some(d => d.message.includes("'skirt'"))).toBe(true);
  });

  it("clearance gate reports exactly one violation: 'meter-disc' vs 'servo-meter' at 0.10–0.20 mm", () => {
    const violated = violatedPairs(report73);
    expect(violated.length).toBe(1);
    expect([violated[0].a, violated[0].b].sort()).toEqual(['meter-disc', 'servo-meter']);
    expect(violated[0].distanceMm).toBeGreaterThan(0.10);
    expect(violated[0].distanceMm).toBeLessThan(0.20);
    const diags = r73.evaluation.diagnostics.filter(d => d.code === 'dfm.clearance.violated');
    expect(diags.length).toBe(1);
    expect(diags[0].message).toContain("'meter-disc'");
    expect(diags[0].message).toContain("'servo-meter'");
  });

  it("channel gate flags the spout openings mismatch: found 5, declared 2", () => {
    const co = report73.voids.find(v => v.part === 'skirt')?.result.channelOpenings;
    expect(co).toBeDefined();
    expect(co!.found).toBe(5);
    const diag = r73.evaluation.diagnostics.find(d => d.code === 'dfm.channel.openings-mismatch');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('declared openings: 2');
  });
});

describe('carousel v7.6.1 — the shipped fix (strict)', () => {
  it('reports ZERO clearance violations — the headline of the v7.6.1 fix', () => {
    expect(violatedPairs(report761)).toEqual([]);
    expect(
      r761.evaluation.diagnostics.filter(d => d.code === 'dfm.clearance.violated'),
    ).toEqual([]);
    // The v7.3 offender pair now measures clear (0.800 mm at last survey).
    const pair = report761.clearance.find(
      c => [c.a, c.b].sort().join('|') === 'meter-disc|servo-meter',
    );
    expect(pair).toBeDefined();
    expect(pair!.status).toBe('ok');
  });

  it('skirt thinnest sits in the fixed band: slit gone (> 0.02), boss sliver remains (< 0.05)', () => {
    const skirt = wallFor(report761, 'skirt');
    expect(skirt).toBeDefined();
    expect(skirt!.thinnestMm).toBeGreaterThan(0.02);
    expect(skirt!.thinnestMm).toBeLessThan(0.05);
  });

  it('full gate sweep stays inside the 10 s budget (reference-machine calibrated)', () => {
    // The 10 s budget is a DESIGN budget defined on the reference machine
    // (where this sweep measures ~6.7 s). CI runners are slower (2x+
    // observed), so the raw number there is runner-hardware lottery, not a
    // regression signal. machineFactor scales the budget by how much slower
    // THIS machine runs a deterministic BVH-build + raycast reference
    // workload than the frozen REF_BASELINE_MS — keeping the gate
    // regression-sensitive everywhere. The factor never tightens below 1,
    // so on the reference machine the gate stays exactly 10 s.
    const machineFactor = measureMachineFactor();
    expect(report761.timings.total).toBeLessThan(10_000 * machineFactor);
  });
});

describe('carousel v7.6.1 — pinned current behavior (descriptive, not normative)', () => {
  // ENGINE-GAP PIN (channel binding): analyzeVoids binds the declared
  // 'spout' channel by LARGEST component, and on v7.6.1 that heuristic
  // picks the skirt's bottom-rim pocket (seed z ≈ −39.1, part-local) — not
  // the actual spout, whose bore spans z ≈ −3.5..−11. The resulting count
  // is 3 mouths, not the spout's declared 2. This pin documents the
  // misbinding; it FLIPS (and should be rewritten to found === 2) when
  // channel binding-by-location ships.
  it('ENGINE-GAP PIN: spout channel misbinds to the bottom-rim pocket (found 3, seed z < -30)', () => {
    const co = report761.voids.find(v => v.part === 'skirt')?.result.channelOpenings;
    expect(co).toBeDefined();
    expect(co!.found).toBe(3);
    expect(co!.channelSeed).toBeDefined();
    expect(co!.channelSeed![2]).toBeLessThan(-30);
  });

  // DESIGN-STATE PIN (sub-floor walls): four parts carry sub-0.75 walls in
  // the SHIPPED v7.6.1 geometry — razor-thin authoring slivers (the
  // per-part thinnest values) plus persistent structural walls (base
  // ≈ 0.247 mm × 3 locating positions; cover ≈ 0.6007 mm × 3 screw-boss
  // columns — both present in v7.3 too). All of it printed acceptably.
  // This pin documents the wall classes the gate currently surfaces; it
  // FLIPS if the fixture geometry or the wall engine changes.
  it('DESIGN-STATE PIN: sub-floor wall part set + per-part thinnest', () => {
    const flagged = report761.walls
      .filter(w => w.result.violations.length > 0)
      .map(w => w.part)
      .sort();
    expect(flagged).toEqual(['base', 'cover', 'meter-disc', 'skirt']);
    expect(wallFor(report761, 'base')!.thinnestMm).toBeCloseTo(0.0070, 2);
    expect(wallFor(report761, 'skirt')!.thinnestMm).toBeCloseTo(0.0228, 2);
    expect(wallFor(report761, 'meter-disc')!.thinnestMm).toBeCloseTo(0.0128, 2);
    expect(wallFor(report761, 'cover')!.thinnestMm).toBeCloseTo(0.0160, 2);
    // The cover's WIDEST reported cluster is the ≈0.60 mm screw-boss wall
    // class (thinnest-first ordering puts it last in the reported list).
    const coverMax = Math.max(
      ...wallFor(report761, 'cover')!.violations.map(v => v.thicknessMm),
    );
    expect(coverMax).toBeCloseTo(0.60, 1);
  });
});

describe('end-to-end enforcement wiring (evaluate)', () => {
  // Exit 0 is impossible for this fixture today: the pinned engine-gap
  // (channel misbinding → openings mismatch) and design-state (sub-floor
  // walls) findings above are error-severity by the gate contract. What
  // this test proves is the WIRING: evaluate fails BECAUSE of the DFM
  // gates and nothing else — every error-severity diagnostic is dfm.*.
  it('evaluateScript({ file: v7.6.1 }) exits 1 with only dfm.* error diagnostics', () => {
    expect(r761.evaluation.exitCode).toBe(1);
    const errors = r761.evaluation.diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    for (const d of errors) {
      expect(d.code, d.message).toMatch(/^dfm\./);
    }
  });
});
