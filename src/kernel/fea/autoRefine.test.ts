// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The one-pass refinement rules without a solver. runFeaStudy is replaced by
// a fake whose peak and error estimate follow the element size.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeaStudyMetadata } from '../../shared/intent/feaStudyRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { RunFeaResult } from './runFea';
import type { FeaSummary } from './types';

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

const { refineBlocker, runFeaStudyRefined } = await import('./autoRefine');

describe('refineBlocker', () => {
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
      outDir, elementBudget: 400_000, ...opts,
    });
  // Bracket-like: n ~ h^-3, error 30 % at 2.5 mm falling at rate 1.
  const bracket = (): FakeModel => ({
    elements: h => Math.round(11_388 * (2.5 / h) ** 3),
    peak: h => 31 * (1 - 0.01 * (2.5 - h)),
    error: h => 30 * (h / 2.5),
  });

  it('does not refine a trusted first pass', async () => {
    model = { ...bracket(), error: () => 12 };
    const r = await run();
    expect(calls).toEqual([2.5]);
    expect(r.summary?.refinement).toMatchObject({ stoppedBy: 'trusted' });
    expect(r.summary?.refinement?.passes).toHaveLength(1);
  });

  it('is exactly one solve with refine: false', async () => {
    model = bracket();
    const r = await run({ refine: false });
    expect(calls).toEqual([2.5]);
    expect(r.summary?.refinement).toBeUndefined();
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.quality-low']);
  });

  it('re-solves once at 0.75x and takes the finer result when it is trusted', async () => {
    model = bracket();
    const r = await run();
    expect(calls).toEqual([2.5, 2.5 * 0.75]);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'trusted' });
    expect(r.summary!.refinement!.passes.map(p => p.meshSizeMm)).toEqual([2.5, 1.875]);
    expect(r.summary!.meshSizeMm).toBe(1.875);
    expect(r.summary!.trust.meshTrusted).toBe(true);
    expect(r.diagnostics.map(d => d.code)).toEqual([]);
  });

  it('warns when the finer pass is still untrusted, and never runs a third', async () => {
    model = { ...bracket(), error: () => 40 };
    const r = await run();
    expect(calls).toHaveLength(2);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'still-untrusted' });
    expect(r.summary!.trust.meshTrusted).toBe(false);
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.refine-stopped']);
    expect(r.diagnostics[0].nextAction).toEqual({ kind: 'inspect-message' });
  });

  it('skips the pass and warns when N x (1/0.75)^3 exceeds the element budget', async () => {
    model = bracket();
    // 11388 / 0.75^3 = 26994: fits 27000, not 26900.
    expect((await run({ elementBudget: 27_000 })).summary!.refinement).toMatchObject({ stoppedBy: 'trusted' });
    calls.length = 0;
    const r = await run({ elementBudget: 26_900 });
    expect(calls).toEqual([2.5]);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'element-budget' });
    expect(r.summary!.refinement!.note).toMatch(/26994/);
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.refine-stopped']);
  });

  it('keeps the first result when the finer pass fails', async () => {
    model = { ...bracket(), fail: h => h < 2.4 };
    const r = await run();
    expect(r.ok).toBe(true);
    expect(r.summary!.meshSizeMm).toBe(2.5);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'pass-failed' });
    expect(r.summary!.refinement!.note).toMatch(/killed/);
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.refine-stopped']);
  });

  it('does not refine for element quality alone', async () => {
    model = { ...bracket(), error: () => 10, minSICN: -0.05 };
    const r = await run();
    expect(calls).toEqual([2.5]);
    expect(r.summary!.refinement).toMatchObject({ stoppedBy: 'quality-limited' });
    expect(r.diagnostics.map(d => d.code)).toEqual(['fea.mesh.quality-low']);
  });
});
