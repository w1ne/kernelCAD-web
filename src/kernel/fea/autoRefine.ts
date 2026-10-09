// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/autoRefine.ts
//
// Bounded automatic mesh refinement around runFeaStudy: solve, and when the
// stress field is untrusted ONLY because the solver's error estimate is high,
// solve again on a finer mesh, at most MAX_REFINE_PASSES more times, inside
// an element budget and a wall-time budget. The answer is the finest pass.
//
// The rules, and why:
//
// - Trigger: the stress-error criterion. Refinement is what lowers a
//   discretisation error. An untrusted verdict from element SHAPE alone
//   (inverted tets, slivers past 1 %) does not trigger it: slivers come from
//   the geometry (a thin web, a tangency line), and a smaller element size
//   makes more of them, not fewer. When both fail, the error criterion still
//   triggers a pass, but convergence (below) cannot vouch for a mesh with bad
//   elements.
//
// - Step: h_new = r * h_old with r = (20 / e)^(1/p), clamped to [0.5, 0.8].
//   e is the governing error estimate in percent, 20 % is the 25 % trust
//   threshold with a margin, and p is the rate the estimate falls with h:
//   1 for the first step, then measured from the last two passes and held to
//   [1, 2]. Quadratic tets reach p = 2 on smooth fields, but governing peaks
//   sit at fillets and holes, where the estimate falls much more slowly (the
//   cookbook bracket measures 0.3-0.6, with mesh-to-mesh noise of a couple of
//   percent). Extrapolating such a stalled rate asks for an enormous mesh,
//   so the plan never assumes slower than first order: the next pass is then
//   a moderate step that mainly serves the convergence check below.
//   r <= 0.8 keeps every step a real refinement; r >= 0.5 caps one step at
//   8x the elements.
//
// - Budgets: the next element count is predicted as N * (h_old / h_new)^3,
//   and the next pass's wall time as the last pass's x (N_new / N_old)^1.5
//   (sparse direct solve; 1.2-1.7 measured on the bracket). The step shrinks
//   until the count fits 90 % of the element budget (KERNELCAD_FEA_MAX_
//   ELEMENTS, default MAX_ELEMENTS) and the time fits what is left of
//   KERNELCAD_FEA_REFINE_TIME_MS (default 300 s for all passes). When what
//   fits is no longer a real step (r > 0.8), refinement stops and says which
//   budget stopped it. A pass that still fails (memory kill, timeout) is
//   dropped and the previous pass stands.
//
// - Convergence: if the governing peak moved less than 5 % over the last
//   step, in the same region, on a mesh without bad elements, the result is
//   trusted even when the error estimate is still above 25 %. Sound because
//   the step is a real one (r <= 0.8): by Richardson, the remaining error in
//   the finer peak is about change / (r^-p - 1), which for a 5 % change is
//   at most 20 % even at first-order convergence (p = 1, r = 0.8) and about
//   12 % at r = 0.7, inside the 25 % the estimator is held to. What it does
//   NOT cover: two meshes that agree by accident before the asymptotic range,
//   which is why the finer pass's governing region must also have carried
//   that peak (within 5 %) on the coarser mesh. A
//   singular peak (a sharp re-entrant corner away from the supports) grows
//   by more than 10 % per step and never meets the rule.

import { rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeaStudyMetadata } from '../../shared/intent/feaStudyRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';
import {
  feaElementBudget,
  meshQualityLimited,
  runFeaStudy,
  STRESS_ERROR_WARN_PERCENT,
  type RunFeaOptions,
  type RunFeaResult,
} from './runFea';
import { detectFeaToolchain } from './toolchain';
import type { FeaRefinement, FeaRefinementPass, FeaRefinementStop, FeaSummary } from './types';

/** Refinement passes after the first solve. */
export const MAX_REFINE_PASSES = 2;
/** Error estimate a step aims for: the 25 % trust threshold with a margin. */
export const REFINE_TARGET_ERROR_PERCENT = 20;
export const MIN_STEP_RATIO = 0.5;
export const MAX_STEP_RATIO = 0.8;
/** A step plans for at most this fraction of the element budget, because
 *  gmsh's count only roughly follows (h_old / h_new)^3. */
export const BUDGET_FILL = 0.9;
/** Governing-peak change under which two passes count as converged. */
export const CONVERGED_CHANGE_PERCENT = 5;
/** Error-estimate rate assumed before two passes measure it, and the floor
 *  on a measured one. */
export const DEFAULT_ERROR_RATE = 1;
/** Asymptotic rate of quadratic tets on a smooth field; the measured-rate cap. */
export const MAX_ERROR_RATE = 2;
/** Wall time of a pass grows as (elements)^this. */
export const PASS_TIME_EXPONENT = 1.5;
/** Default wall-time budget for all passes of one run, ms. */
export const DEFAULT_REFINE_TIME_MS = 300_000;

/** `KERNELCAD_FEA_REFINE_TIME_MS` when it is a positive number, else the default. */
export function feaRefineTimeBudgetMs(env: NodeJS.ProcessEnv = process.env): number {
  const v = Number(env.KERNELCAD_FEA_REFINE_TIME_MS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_REFINE_TIME_MS;
}

export interface RefineFeaOptions extends RunFeaOptions {
  /** false: one solve at the study's meshSize, no refinement. Default true. */
  refine?: boolean;
  /** Overrides for tests; default from the environment. */
  elementBudget?: number;
  timeBudgetMs?: number;
}

/** One pass's row in the refinement record. */
export function passRecord(s: FeaSummary, prev: FeaRefinementPass | undefined, wallMs: number): FeaRefinementPass {
  const region = s.hotSpots[0]?.region;
  const change = prev !== undefined && s.maxVonMisesMPa > 0
    ? (Math.abs(s.maxVonMisesMPa - prev.governingPeakMPa) / s.maxVonMisesMPa) * 100
    : undefined;
  return {
    meshSizeMm: s.meshSizeMm,
    elementCount: s.elementCount,
    governingPeakMPa: s.maxVonMisesMPa,
    ...(s.maxStressErrorPercent !== undefined ? { maxStressErrorPercent: s.maxStressErrorPercent } : {}),
    meshTrusted: s.trust.meshTrusted,
    ...(region !== undefined ? { region } : {}),
    ...(change !== undefined ? { peakChangePercent: change } : {}),
    wallMs,
  };
}

/** Why this pass needs no (or cannot use) a finer one; undefined when it
 *  should be refined. */
export function refineBlocker(s: FeaSummary): FeaRefinementStop | undefined {
  if (s.trust.meshTrusted) return 'trusted';
  if (s.maxStressErrorPercent === undefined) return 'no-error-estimate';
  if (!(s.maxStressErrorPercent > STRESS_ERROR_WARN_PERCENT)) return 'quality-limited';
  return undefined;
}

/** Rate the error estimate falls with h, from the last two passes. */
export function observedErrorRate(passes: readonly FeaRefinementPass[]): number {
  if (passes.length < 2) return DEFAULT_ERROR_RATE;
  const a = passes[passes.length - 2];
  const b = passes[passes.length - 1];
  const ea = a.maxStressErrorPercent;
  const eb = b.maxStressErrorPercent;
  if (ea === undefined || eb === undefined || !(ea > 0) || !(eb > 0)) return DEFAULT_ERROR_RATE;
  const p = Math.log(ea / eb) / Math.log(a.meshSizeMm / b.meshSizeMm);
  return Number.isFinite(p) ? Math.min(MAX_ERROR_RATE, Math.max(DEFAULT_ERROR_RATE, p)) : DEFAULT_ERROR_RATE;
}

export type RefinePlan =
  | { ok: true; meshSizeMm: number; ratio: number; predictedElements: number; predictedWallMs: number }
  | { ok: false; stop: 'element-budget' | 'time-budget'; note: string };

/** Largest element count whose predicted pass time fits `remainingMs`. */
const elementsForTime = (last: FeaRefinementPass, remainingMs: number): number =>
  remainingMs > 0 ? last.elementCount * (remainingMs / last.wallMs) ** (1 / PASS_TIME_EXPONENT) : 0;

/** The next pass's element size, shrunk to fit both budgets, or why no real
 *  step (ratio <= 0.8) fits them. */
export function planRefinement(
  passes: readonly FeaRefinementPass[],
  budget: { elements: number; timeMs: number; elapsedMs: number },
): RefinePlan {
  const last = passes[passes.length - 1];
  const err = last.maxStressErrorPercent ?? REFINE_TARGET_ERROR_PERCENT * 2;
  const p = observedErrorRate(passes);
  const wanted = Math.min(MAX_STEP_RATIO, Math.max(MIN_STEP_RATIO, (REFINE_TARGET_ERROR_PERCENT / err) ** (1 / p)));
  const remainingMs = budget.timeMs - budget.elapsedMs;
  const byElements = budget.elements * BUDGET_FILL;
  const byTime = elementsForTime(last, remainingMs);
  const predicted = Math.min(last.elementCount / wanted ** 3, byElements, byTime);
  const ratio = Math.cbrt(last.elementCount / predicted);
  if (!(ratio <= MAX_STEP_RATIO)) {
    const timeBound = byTime < byElements;
    return {
      ok: false,
      stop: timeBound ? 'time-budget' : 'element-budget',
      note: timeBound
        ? `a real refinement step (element size x${MAX_STEP_RATIO} or finer, about ${Math.round(last.elementCount / MAX_STEP_RATIO ** 3)} elements) is predicted to take longer than the ${Math.round(Math.max(0, remainingMs) / 1000)} s left of the ${Math.round(budget.timeMs / 1000)} s wall-time budget`
        : `a real refinement step (element size x${MAX_STEP_RATIO} or finer, about ${Math.round(last.elementCount / MAX_STEP_RATIO ** 3)} elements) does not fit the ${budget.elements}-element budget`,
    };
  }
  const predictedWallMs = last.wallMs * (predicted / last.elementCount) ** PASS_TIME_EXPONENT;
  return { ok: true, meshSizeMm: last.meshSizeMm * ratio, ratio, predictedElements: predicted, predictedWallMs };
}

/** The finer pass's governing region also governed, at a peak within the
 *  convergence band, on the coarser pass. Region names alone are not enough:
 *  symmetric regions (the tension and compression faces of a bent beam)
 *  carry equal peaks and swap places between meshes. */
function sameGoverningRegion(prevRegion: string | undefined, cur: FeaRefinementPass, previous: FeaSummary | undefined): boolean {
  if (cur.region === undefined) return false;
  if (cur.region === prevRegion) return true;
  const there = previous?.hotSpots.find(h => h.region === cur.region);
  return there !== undefined
    && (Math.abs(there.maxVonMisesMPa - cur.governingPeakMPa) / cur.governingPeakMPa) * 100 < CONVERGED_CHANGE_PERCENT;
}

/** The last step meets the convergence rule (see the header). `previous` is
 *  the coarser pass's summary, for its per-region peaks. */
export function lastStepConverged(
  passes: readonly FeaRefinementPass[],
  finest: FeaSummary,
  previous?: FeaSummary,
): boolean {
  if (passes.length < 2) return false;
  const prev = passes[passes.length - 2];
  const cur = passes[passes.length - 1];
  return (
    cur.meshSizeMm <= prev.meshSizeMm * MAX_STEP_RATIO * (1 + 1e-6)
    && cur.peakChangePercent !== undefined
    && cur.peakChangePercent < CONVERGED_CHANGE_PERCENT
    && sameGoverningRegion(prev.region, cur, previous)
    && !meshQualityLimited(finest.quality, finest.elementCount)
  );
}

interface RefineRun {
  shape: OcctBackend;
  declared: FeaStudyMetadata;
  owner: string;
  records: readonly FeatureRecord[] | undefined;
  opts: RefineFeaOptions;
  elementBudget: number;
  timeBudgetMs: number;
  started: number;
  passes: FeaRefinementPass[];
  /** The finest pass that solved, and the directory it was written to. */
  chosen: RunFeaResult & { summary: FeaSummary };
  chosenDir: string;
  /** Summary of the pass before the chosen one. */
  previous?: FeaSummary;
}

const passDir = (outDir: string, k: number): string => join(outDir, `refine-${k}`);

function failureNote(r: RunFeaResult, meshSizeMm: number): string {
  const err = r.diagnostics.find(d => d.severity === 'error');
  return `the pass at ${meshSizeMm.toFixed(2)} mm failed (${err?.code ?? 'no result'}: ${err?.message ?? 'no summary'}); the previous pass stands`;
}

/** Run one finer pass; on success it becomes the chosen one. */
async function runPass(run: RefineRun, k: number, meshSizeMm: number): Promise<{ ok: true } | { ok: false; note: string }> {
  const dir = passDir(run.opts.outDir, k);
  const t0 = Date.now();
  const r = await runFeaStudy(run.shape, { ...run.declared, meshSize: meshSizeMm }, run.owner, run.records, {
    ...run.opts,
    outDir: dir,
  });
  if (r.summary === undefined) {
    await rm(dir, { recursive: true, force: true });
    return { ok: false, note: failureNote(r, meshSizeMm) };
  }
  run.passes.push(passRecord(r.summary, run.passes[run.passes.length - 1], Date.now() - t0));
  // Only the chosen pass's deck is kept on disk; fine decks are large.
  await rm(run.chosenDir === run.opts.outDir ? join(run.opts.outDir, 'solver') : run.chosenDir, { recursive: true, force: true });
  run.previous = run.chosen.summary;
  run.chosen = { ...r, summary: r.summary };
  run.chosenDir = dir;
  return { ok: true };
}

/** Refine until trusted, converged, or out of passes or budget. */
async function refineLoop(run: RefineRun): Promise<{ stop: FeaRefinementStop; note?: string }> {
  for (let k = 1; ; k++) {
    const blocker = refineBlocker(run.chosen.summary);
    if (blocker !== undefined) return { stop: blocker };
    if (k > MAX_REFINE_PASSES) return { stop: 'max-passes' };
    const plan = planRefinement(run.passes, {
      elements: run.elementBudget,
      timeMs: run.timeBudgetMs,
      elapsedMs: Date.now() - run.started,
    });
    if (!plan.ok) return { stop: plan.stop, note: plan.note };
    const pass = await runPass(run, k, plan.meshSizeMm);
    if (!pass.ok) return { stop: 'pass-failed', note: pass.note };
    if (!run.chosen.summary.trust.meshTrusted && lastStepConverged(run.passes, run.chosen.summary, run.previous)) {
      return { stop: 'converged' };
    }
  }
}

/** Move the chosen pass's deck to `<outDir>/solver`, where a single run
 *  keeps it, and repoint the artifact paths. */
async function promoteChosen(run: RefineRun): Promise<RunFeaResult['artifacts']> {
  const { outDir } = run.opts;
  if (run.chosenDir === outDir) return run.chosen.artifacts;
  const from = join(run.chosenDir, 'solver');
  const to = join(outDir, 'solver');
  if (!existsSync(from)) return run.chosen.artifacts;
  await rm(to, { recursive: true, force: true });
  await rename(from, to);
  await rm(run.chosenDir, { recursive: true, force: true });
  return Object.fromEntries(
    Object.entries(run.chosen.artifacts).map(([k, v]) => [k, typeof v === 'string' ? v.replace(from, to) : v]),
  ) as RunFeaResult['artifacts'];
}

const fmtPass = (p: FeaRefinementPass): string =>
  `${p.meshSizeMm.toFixed(2)} mm / ${p.elementCount} elements / ${p.governingPeakMPa.toFixed(1)} MPa` +
  (p.maxStressErrorPercent !== undefined ? ` / error ${p.maxStressErrorPercent.toFixed(1)}%` : '');

/** Stops that leave an untrusted result because of a budget or a failed pass. */
const BUDGET_STOPS: ReadonlySet<FeaRefinementStop> = new Set(['element-budget', 'time-budget', 'pass-failed']);

function refineStoppedDiagnostic(s: FeaSummary, refinement: FeaRefinement, owner: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'fea.mesh.refine-stopped',
    severity: 'warn',
    featureId: owner,
    message:
      `feaStudy '${s.study}': automatic mesh refinement stopped before the stress field was trusted: ${refinement.note ?? refinement.stoppedBy}. ` +
      `Passes: ${refinement.passes.map(fmtPass).join('; ')}. The result is the finest pass that solved; ${s.trust.reasons.join('; ')}. ` +
      `Displacement (${s.maxDisplacementMm.toFixed(4)} mm) is far less mesh-sensitive than the peak stress (${s.maxVonMisesMPa.toFixed(1)} MPa).`,
    hint: HINT_TEMPLATES['fea.mesh.refine-stopped'].template,
  };
}

/** Fold the refinement record, the convergence trust and the matching
 *  diagnostics into the chosen pass's result. */
function finalDiagnostics(
  run: RefineRun,
  refinement: FeaRefinement,
): { trust: FeaSummary['trust']; diagnostics: CompilerDiagnostic[] } {
  const s = run.chosen.summary;
  const others = run.chosen.diagnostics.filter(d => d.code !== 'fea.mesh.quality-low');
  if (refinement.stoppedBy === 'converged') {
    return { trust: { meshTrusted: true, reasons: [], basis: 'peak-convergence' }, diagnostics: others };
  }
  if (!s.trust.meshTrusted && BUDGET_STOPS.has(refinement.stoppedBy)) {
    return { trust: s.trust, diagnostics: [...others, refineStoppedDiagnostic(s, refinement, run.owner)] };
  }
  return { trust: s.trust, diagnostics: run.chosen.diagnostics };
}

async function finalize(run: RefineRun, stop: FeaRefinementStop, note: string | undefined): Promise<RunFeaResult> {
  const refinement: FeaRefinement = {
    passes: run.passes,
    converged: lastStepConverged(run.passes, run.chosen.summary, run.previous),
    stoppedBy: stop,
    elementBudget: run.elementBudget,
    timeBudgetMs: run.timeBudgetMs,
    ...(note !== undefined ? { note } : {}),
  };
  const { trust, diagnostics } = finalDiagnostics(run, refinement);
  const summary: FeaSummary = { ...run.chosen.summary, trust, refinement };
  const artifacts = await promoteChosen(run);
  await writeFile(join(run.opts.outDir, 'fea-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  return {
    ...run.chosen,
    ok: !diagnostics.some(d => d.severity === 'error'),
    summary,
    diagnostics: withNextActions(diagnostics),
    artifacts,
  };
}

/**
 * runFeaStudy with bounded automatic refinement (rules in the file header).
 * With `refine: false`, or when the first solve fails, this is exactly one
 * runFeaStudy call. Otherwise the summary carries `refinement`, and its
 * numbers, artifacts and raw field are the finest pass's.
 */
export async function runFeaStudyRefined(
  shape: OcctBackend,
  declared: FeaStudyMetadata,
  owner: string,
  records: readonly FeatureRecord[] | undefined,
  opts: RefineFeaOptions,
): Promise<RunFeaResult> {
  const started = Date.now();
  if (opts.refine === false) return runFeaStudy(shape, declared, owner, records, opts);
  const toolchain = opts.toolchain ?? (await detectFeaToolchain(opts.cwd));
  const first = await runFeaStudy(shape, declared, owner, records, { ...opts, toolchain });
  if (first.summary === undefined) return first;
  const run: RefineRun = {
    shape,
    declared,
    owner,
    records,
    opts: { ...opts, toolchain },
    elementBudget: opts.elementBudget ?? feaElementBudget(),
    timeBudgetMs: opts.timeBudgetMs ?? feaRefineTimeBudgetMs(),
    started,
    passes: [passRecord(first.summary, undefined, Date.now() - started)],
    chosen: { ...first, summary: first.summary },
    chosenDir: opts.outDir,
  };
  const { stop, note } = await refineLoop(run);
  return finalize(run, stop, note);
}
