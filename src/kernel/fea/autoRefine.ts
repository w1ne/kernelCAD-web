// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/autoRefine.ts
//
// One automatic refinement pass around runFeaStudy. After the first solve, if
// the stress is untrusted ONLY because the solver's error estimate is high,
// solve once more at REFINE_RATIO x the element size and keep that result.
// Element-quality failures alone do not trigger it: slivers come from the
// geometry, and a smaller element size makes more of them.
//
// The pass runs only when its predicted element count, N / REFINE_RATIO^3,
// fits the element ceiling (KERNELCAD_FEA_MAX_ELEMENTS, default MAX_ELEMENTS).
// Trust is the normal per-mesh rule applied to the finer pass. When the pass
// is skipped, fails (memory kill, timeout; the first result stands) or is
// still untrusted, `fea.mesh.refine-stopped` says so.

import { rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeaStudyMetadata } from '../../shared/intent/feaStudyRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';
import { feaElementBudget, runFeaStudy, STRESS_ERROR_WARN_PERCENT, type RunFeaOptions, type RunFeaResult } from './runFea';
import { detectFeaToolchain } from './toolchain';
import type { FeaRefinement, FeaRefinementPass, FeaRefinementStop, FeaSummary } from './types';

/** Element size of the refinement pass relative to the first. */
export const REFINE_RATIO = 0.75;

export interface RefineFeaOptions extends RunFeaOptions {
  /** false: one solve at the study's meshSize, no refinement. Default true. */
  refine?: boolean;
  /** Override for tests; default KERNELCAD_FEA_MAX_ELEMENTS. */
  elementBudget?: number;
}

const passRecord = (s: FeaSummary): FeaRefinementPass => ({
  meshSizeMm: s.meshSizeMm,
  elementCount: s.elementCount,
  governingPeakMPa: s.maxVonMisesMPa,
  ...(s.maxStressErrorPercent !== undefined ? { maxStressErrorPercent: s.maxStressErrorPercent } : {}),
  meshTrusted: s.trust.meshTrusted,
});

/** Why a pass needs no finer one; undefined when the error criterion alone
 *  makes it untrusted. */
export function refineBlocker(s: FeaSummary): FeaRefinementStop | undefined {
  if (s.trust.meshTrusted) return 'trusted';
  if (s.maxStressErrorPercent === undefined) return 'no-error-estimate';
  return s.maxStressErrorPercent > STRESS_ERROR_WARN_PERCENT ? undefined : 'quality-limited';
}

const fmtPass = (p: FeaRefinementPass): string =>
  `${p.meshSizeMm.toFixed(2)} mm / ${p.elementCount} elements / ${p.governingPeakMPa.toFixed(1)} MPa` +
  (p.maxStressErrorPercent !== undefined ? ` / error ${p.maxStressErrorPercent.toFixed(1)}%` : '');

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

/** The finer pass wrote to `<outDir>/refine`; move its deck to
 *  `<outDir>/solver`, where a single run keeps it, and repoint the artifacts. */
async function promoteRefined(outDir: string, dir: string, artifacts: RunFeaResult['artifacts']): Promise<RunFeaResult['artifacts']> {
  const from = join(dir, 'solver');
  const to = join(outDir, 'solver');
  if (existsSync(from)) {
    await rm(to, { recursive: true, force: true });
    await rename(from, to);
  }
  await rm(dir, { recursive: true, force: true });
  return Object.fromEntries(
    Object.entries(artifacts).map(([k, v]) => [k, typeof v === 'string' ? v.replace(from, to) : v]),
  ) as RunFeaResult['artifacts'];
}

async function finish(
  chosen: RunFeaResult & { summary: FeaSummary },
  passes: FeaRefinementPass[],
  stoppedBy: FeaRefinementStop,
  note: string | undefined,
  owner: string,
  outDir: string,
  artifacts: RunFeaResult['artifacts'],
): Promise<RunFeaResult> {
  const refinement: FeaRefinement = { passes, stoppedBy, ...(note !== undefined ? { note } : {}) };
  const stopped = !chosen.summary.trust.meshTrusted && ['element-budget', 'pass-failed', 'still-untrusted'].includes(stoppedBy);
  const diagnostics = stopped
    ? [...chosen.diagnostics.filter(d => d.code !== 'fea.mesh.quality-low'), refineStoppedDiagnostic(chosen.summary, refinement, owner)]
    : chosen.diagnostics;
  const summary: FeaSummary = { ...chosen.summary, refinement };
  await writeFile(join(outDir, 'fea-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  return {
    ...chosen,
    ok: !diagnostics.some(d => d.severity === 'error'),
    summary,
    diagnostics: withNextActions(diagnostics),
    artifacts,
  };
}

/**
 * runFeaStudy with one automatic refinement pass (rules in the file header).
 * With `refine: false`, or when the first solve fails, this is exactly one
 * runFeaStudy call. Otherwise the summary carries `refinement`, and its
 * numbers, artifacts and raw field are the finer pass's when it ran.
 */
export async function runFeaStudyRefined(
  shape: OcctBackend,
  declared: FeaStudyMetadata,
  owner: string,
  records: readonly FeatureRecord[] | undefined,
  opts: RefineFeaOptions,
): Promise<RunFeaResult> {
  if (opts.refine === false) return runFeaStudy(shape, declared, owner, records, opts);
  const toolchain = opts.toolchain ?? (await detectFeaToolchain(opts.cwd));
  const first = await runFeaStudy(shape, declared, owner, records, { ...opts, toolchain });
  if (first.summary === undefined) return first;
  const firstResult = { ...first, summary: first.summary };
  const passes = [passRecord(first.summary)];
  const done = (r: typeof firstResult, stop: FeaRefinementStop, note?: string, artifacts = r.artifacts) =>
    finish(r, passes, stop, note, owner, opts.outDir, artifacts);

  const blocker = refineBlocker(first.summary);
  if (blocker !== undefined) return done(firstResult, blocker);
  const budget = opts.elementBudget ?? feaElementBudget();
  const predicted = Math.round(first.summary.elementCount / REFINE_RATIO ** 3);
  if (predicted > budget) {
    return done(firstResult, 'element-budget', `the finer pass (element size x${REFINE_RATIO}) is predicted at about ${predicted} elements, over the ${budget}-element budget`);
  }

  const meshSizeMm = first.summary.meshSizeMm * REFINE_RATIO;
  const dir = join(opts.outDir, 'refine');
  const r = await runFeaStudy(shape, { ...declared, meshSize: meshSizeMm }, owner, records, { ...opts, toolchain, outDir: dir });
  if (r.summary === undefined) {
    await rm(dir, { recursive: true, force: true });
    const err = r.diagnostics.find(d => d.severity === 'error');
    return done(firstResult, 'pass-failed', `the pass at ${meshSizeMm.toFixed(2)} mm failed (${err?.code ?? 'no result'}: ${err?.message ?? 'no summary'}); the first pass stands`);
  }
  passes.push(passRecord(r.summary));
  // Only the chosen pass's deck stays on disk; fine decks are large.
  await rm(join(opts.outDir, 'solver'), { recursive: true, force: true });
  const artifacts = await promoteRefined(opts.outDir, dir, r.artifacts);
  return done({ ...r, summary: r.summary }, r.summary.trust.meshTrusted ? 'trusted' : 'still-untrusted', undefined, artifacts);
}
