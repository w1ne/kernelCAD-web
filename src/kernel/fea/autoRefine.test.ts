// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The refinement rules without a solver: step size, budgets, convergence,
// and how the passes fold into one result. runFeaStudy is replaced by a
// fake whose peak and error estimate follow the element size.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeaStudyMetadata } from '../../shared/intent/feaStudyRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { RunFeaResult } from './runFea';
import type { FeaRefinementPass, FeaSummary } from './types';

/** Fake solve: element count, peak and error estimate as functions of h. */
interface FakeModel {
  elements: (h: number) => number;
  peak: (h: number) => number;
  error: (h: number) => number;
  minSICN?: number;
  fail?: (h: number) => boolean;
}
let model: FakeModel;
const calls: number[] = [];

function fakeSummary(h: number): FeaSummary {
  const err = model.error(h);
  const n = model.elements(h);
  const qualityBad = (model.minSICN ?? 0.5) <= 0;
  const reasons = [
    ...(qualityBad ? ['mesh contains inverted or degenerate elements'] : []),
    ...(err > 25 ? [`error ${err.toFixed(1)}% above 25%`] : []),
  ];
  return {
    study: 's',
    material: { name: 'petg', E: 2700, nu: 0.4, yield: 55 },
    maxVonMisesMPa: model.peak(h),
    maxVonMisesAt: [0, 0, 0],
    maxDisplacementMm: 1,
    maxDisplacementAt: [0, 0, 0],
    minSafetyFactor: 55 / model.peak(h),
    nodeCount: n * 2,
    elementCount: n,
    meshSizeMm: h,
    quality: { minSICN: model.minSICN ?? 0.5, meanSICN: 0.8, lowQualityCount: 0, lowQualityThreshold: 0.1 },
    maxStressErrorPercent: err,
    trust: { meshTrusted: reasons.length === 0, reasons },
    hotSpots: [{ region: '@kc[fillet/face/f8]', maxVonMisesMPa: model.peak(h), nodeId: 1, at: [0, 0, 0], safetyFactor: 55 / model.peak(h) }],
    appliedForceN: [0, 0, -1],
    solveMs: 1,
    meshMs: 1,
  };
}

vi.mock('./runFea', async (orig) => {
  const actual = await orig<typeof import('./runFea')>();
  return {
    ...actual,
    runFeaStudy: vi.fn(async (_shape: unknown, study: FeaStudyMetadata): Promise<RunFeaResult> => {
      const h = typeof study.meshSize === 'number' ? study.meshSize : 2.5;
      calls.push(h);
      if (model.fail?.(h)) {
        return {
          ok: false,
          diagnostics: [{ target: 'export-occt', code: 'fea.mesh.too-large', severity: 'error', message: 'killed (exit 255)' }],
          artifacts: {},
        };
      }
      const summary = fakeSummary(h);
      const diagnostics: CompilerDiagnostic[] = summary.trust.meshTrusted
        ? []
        : [{ target: 'export-occt', code: 'fea.mesh.quality-low', severity: 'warn', message: 'untrusted' }];
      return { ok: true, summary, diagnostics, artifacts: {} };
    }),
  };
});
vi.mock('./toolchain', async (orig) => ({
  ...(await orig<typeof import('./toolchain')>()),
  detectFeaToolchain: async () => ({ ok: true, ccx: 'ccx', python: 'python', missing: [] }),
}));

const {
  lastStepConverged,
  observedErrorRate,
  planRefinement,
  refineBlocker,
  runFeaStudyRefined,
} = await import('./autoRefine');

const pass = (meshSizeMm: number, elementCount: number, peak: number, err: number, extra: Partial<FeaRefinementPass> = {}): FeaRefinementPass => ({
  meshSizeMm, elementCount, governingPeakMPa: peak, maxStressErrorPercent: err, meshTrusted: err <= 25, region: 'r', wallMs: 10_000, ...extra,
});

describe('planRefinement', () => {
  const roomy = { elements: 400_000, timeMs: 300_000, elapsedMs: 10_000 };

  it('steps by (20 / error) at the default first-order rate, clamped to [0.5, 0.8]', () => {
    const p = planRefinement([pass(2.5, 11_388, 31, 30)], roomy);
    expect(p.ok && p.ratio).toBeCloseTo(20 / 30, 6);
    expect(p.ok && p.meshSizeMm).toBeCloseTo(2.5 * (20 / 30), 6);
    expect(p.ok && p.predictedElements).toBeCloseTo(11_388 / (20 / 30) ** 3, 0);
    // A barely-untrusted pass still takes a real step.
    expect((planRefinement([pass(2.5, 1000, 31, 24)], roomy) as { ratio: number }).ratio).toBe(0.8);
    // A far-off pass is capped at 8x the elements.
    expect((planRefinement([pass(2.5, 1000, 31, 90)], roomy) as { ratio: number }).ratio).toBe(0.5);
  });

  it('uses the rate measured over the last two passes, held to [1, 2]', () => {
    const passes = [pass(2.5, 11_388, 31, 40), pass(1.8, 30_475, 30.7, 27)];
    const p = observedErrorRate(passes);
    expect(p).toBeCloseTo(Math.log(40 / 27) / Math.log(2.5 / 1.8), 6);
    // A stalled estimate (the bracket: 30 % -> 26.3 %) is not extrapolated.
    expect(observedErrorRate([pass(2.5, 1, 1, 30), pass(1.67, 1, 1, 26.3)])).toBe(1);
    expect(observedErrorRate([pass(2, 1, 1, 40), pass(1, 1, 1, 5)])).toBe(2);
  });

  it('shrinks the step to fit the element budget, and stops when no real step fits', () => {
    const p = planRefinement([pass(2.5, 11_388, 31, 30)], { ...roomy, elements: 30_000 });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.predictedElements).toBeCloseTo(27_000, 0);
    expect(p.meshSizeMm).toBeCloseTo(2.5 * Math.cbrt(11_388 / 27_000), 6);
    const none = planRefinement([pass(1.8, 25_000, 31, 30)], { ...roomy, elements: 30_000 });
    expect(none).toMatchObject({ ok: false, stop: 'element-budget' });
  });

  it('shrinks the step to fit the time left, and stops when no real step fits', () => {
    // 10 s pass; 50 s left fits 10000 * 5^(1/1.5) = 29240 elements.
    const p = planRefinement([pass(2.5, 10_000, 31, 40)], { elements: 400_000, timeMs: 60_000, elapsedMs: 10_000 });
    expect(p.ok && p.predictedElements).toBeCloseTo(10_000 * 5 ** (1 / 1.5), 0);
    expect(p.ok && p.predictedWallMs).toBeCloseTo(50_000, 0);
    const none = planRefinement([pass(2.5, 10_000, 31, 40)], { elements: 400_000, timeMs: 60_000, elapsedMs: 40_000 });
    expect(none).toMatchObject({ ok: false, stop: 'time-budget' });
  });
});

describe('convergence rule', () => {
  const finest = { quality: { minSICN: 0.3, meanSICN: 0.8, lowQualityCount: 0, lowQualityThreshold: 0.1 }, elementCount: 1000 } as FeaSummary;
  it('needs a real step, a small change, the same region and good elements', () => {
    const a = pass(2.5, 1, 31, 30);
    expect(lastStepConverged([a, pass(1.8, 1, 30.7, 26, { peakChangePercent: 1 })], finest)).toBe(true);
    expect(lastStepConverged([a, pass(1.8, 1, 28, 26, { peakChangePercent: 10 })], finest)).toBe(false);
    expect(lastStepConverged([a, pass(2.2, 1, 30.7, 26, { peakChangePercent: 1 })], finest)).toBe(false);
    expect(lastStepConverged([a, pass(1.8, 1, 30.7, 26, { peakChangePercent: 1, region: 'other' })], finest)).toBe(false);
    // Symmetric regions swap between meshes: accepted when the coarser pass
    // already carried that peak in the finer pass's region.
    const swapped = pass(1.8, 1, 30.7, 26, { peakChangePercent: 1, region: 'other' });
    const coarse = (vm: number) => ({ hotSpots: [{ region: 'r', maxVonMisesMPa: 31 }, { region: 'other', maxVonMisesMPa: vm }] }) as FeaSummary;
    expect(lastStepConverged([a, swapped], finest, coarse(30.9))).toBe(true);
    expect(lastStepConverged([a, swapped], finest, coarse(20))).toBe(false);
    const inverted = { ...finest, quality: { ...finest.quality, minSICN: -0.01 } } as FeaSummary;
    expect(lastStepConverged([a, pass(1.8, 1, 30.7, 26, { peakChangePercent: 1 })], inverted)).toBe(false);
    expect(lastStepConverged([a], finest)).toBe(false);
  });

  it('refines on the error criterion only', () => {
    model = { elements: () => 1, peak: () => 1, error: () => 30, minSICN: 0.5 };
    expect(refineBlocker(fakeSummary(2))).toBeUndefined();
    model = { elements: () => 1, peak: () => 1, error: () => 10, minSICN: -0.1 };
    expect(refineBlocker(fakeSummary(2))).toBe('quality-limited');
    model = { elements: () => 1, peak: () => 1, error: () => 10 };
    expect(refineBlocker(fakeSummary(2))).toBe('trusted');
  });
});

describe('runFeaStudyRefined', () => {
  let outDir: string;
  beforeEach(async () => {
    calls.length = 0;
    outDir = await mkdtemp(join(tmpdir(), 'kc-refine-test-'));
  });
  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });
  const run = (opts: Record<string, unknown> = {}) =>
    runFeaStudyRefined({} as OcctBackend, { name: 's', meshSize: 2.5 } as FeaStudyMetadata, 'owner', [], {
      outDir, elementBudget: 400_000, timeBudgetMs: 300_000, ...opts,
    });
  // Bracket-like: n ~ h^-3, error 30 % at 2.5 mm falling at rate 0.57, peak drifting 1 %.
  const bracket = (): FakeModel => ({
    elements: h => Math.round(11_388 * (2.5 / h) ** 3),
    peak: h => 31 * (1 - 0.01 * (2.5 - h)),
    error: h => 30 * (h / 2.5) ** 0.57,
  });

  it('does not refine a trusted first pass', async () => {
    model = { ...bracket(), error: () => 12 };
    const r = await run();
    expect(calls).toEqual([2.5]);
    expect(r.summary?.refinement).toMatchObject({ stoppedBy: 'trusted', converged: false });
    expect(r.summary?.refinement?.passes).toHaveLength(1);
  });

  it('is exactly one solve with refine: false', async () => {
    model = bracket();
    const r = await run({ refine: false });
    expect(calls).toEqual([2.5]);
    expect(r.summary?.refinement).toBeUndefined();
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.quality-low']);
  });

  it('refines until the peak converges and trusts it without the mesh-quality warning', async () => {
    // The error estimate falls too slowly to clear 25 %, the peak barely moves.
    model = { ...bracket(), error: h => 30 * (h / 2.5) ** 0.3 };
    const r = await run();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBeCloseTo(2.5 * (20 / 30), 6);
    const ref = r.summary!.refinement!;
    expect(ref.stoppedBy).toBe('converged');
    expect(ref.converged).toBe(true);
    expect(ref.passes[1].peakChangePercent).toBeLessThan(5);
    expect(r.summary!.trust).toEqual({ meshTrusted: true, reasons: [], basis: 'peak-convergence' });
    expect(r.summary!.meshSizeMm).toBe(calls[1]);
    expect(r.diagnostics.map(d => d.code)).toEqual([]);
  });

  it('reports a budget stop with fea.mesh.refine-stopped instead of the retry-smaller hint', async () => {
    model = { ...bracket(), peak: h => 31 * (2.5 / h) ** 0.4 };
    const r = await run({ elementBudget: 30_000 });
    const ref = r.summary!.refinement!;
    expect(ref.passes.length).toBeGreaterThanOrEqual(2);
    expect(ref.passes.every(p => p.elementCount <= 30_000)).toBe(true);
    expect(ref.stoppedBy).toBe('element-budget');
    expect(r.summary!.trust.meshTrusted).toBe(false);
    const codes = r.diagnostics.map(d => d.code);
    expect(codes).toContain('fea.mesh.refine-stopped');
    expect(codes).not.toContain('fea.mesh.quality-low');
    expect(r.diagnostics.find(d => d.code === 'fea.mesh.refine-stopped')?.nextAction).toEqual({ kind: 'inspect-message' });
  });

  it('keeps the previous pass when a finer pass fails', async () => {
    model = { ...bracket(), fail: h => h < 2.4 };
    const r = await run();
    expect(r.ok).toBe(true);
    expect(r.summary!.meshSizeMm).toBe(2.5);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'pass-failed' });
    expect(r.summary!.refinement!.note).toMatch(/killed/);
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.refine-stopped']);
  });

  it('stops after the allowed passes and keeps the retry hint when nothing converges', async () => {
    model = { ...bracket(), peak: h => 31 * (2.5 / h) ** 0.4, error: () => 40 };
    const r = await run();
    expect(calls).toHaveLength(3);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'max-passes', converged: false });
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.quality-low']);
  });

  it('does not refine for element quality alone', async () => {
    model = { ...bracket(), error: () => 10, minSICN: -0.05 };
    const r = await run();
    expect(calls).toEqual([2.5]);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'quality-limited' });
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.quality-low']);
  });
});
