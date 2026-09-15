// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/fea/runFeaGate.ts
//
// Evaluate-time enforcement of a declared structural study — the FEA sibling
// of `runDfmChecksOnModel`, plugged into the same seam in
// `evaluateAndBuildScript` so CLI evaluate, `evaluate_script`, and the eval
// harness all enforce identically.
//
// STRICTLY OPT-IN, and narrowly so: the gate runs only for studies that
// declare `minSafetyFactor`. A study without one is a report — you run it
// with `run_fea` when you want the numbers. A study WITH one has asked for a
// pass/fail verdict, and paying a few seconds of solver time on every
// evaluate is exactly what that declaration bought. Scripts with no feaStudy
// pay a records scan returning undefined.
//
// The gate never converts an absent toolchain into a pass. `ccx`/gmsh
// missing produces `fea.solver.unavailable` at ERROR severity, because a
// declared minimum safety factor that was never checked is not satisfied —
// it is unverified, and unverified must not look green. Set
// `KERNELCAD_FEA_GATE=off` to skip the run deliberately (the skip itself is
// reported, so it cannot be mistaken for a pass either).

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { cleanupJobDir, runFeaStudy } from '../../../kernel/fea/runFea';
import type { FeaSummary } from '../../../kernel/fea/types';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import type { BuiltModel } from '../../buildModel';
import { findFeaStudies } from './findFeaStudies';

export interface FeaGateReport {
  diagnostics: CompilerDiagnostic[];
  summaries: FeaSummary[];
  /** Studies that were skipped because the gate is switched off. */
  skipped: string[];
}

/** `KERNELCAD_FEA_GATE=off` disables the evaluate-time solve. */
function gateEnabled(): boolean {
  return (process.env.KERNELCAD_FEA_GATE ?? 'on').toLowerCase() !== 'off';
}

/**
 * Run every gate-bearing `feaStudy` declared by the model.
 *
 * Returns `undefined` when the model declares no study with a
 * `minSafetyFactor` — the common case, and the one that must cost nothing.
 */
export async function runFeaGateOnModel(model: BuiltModel): Promise<FeaGateReport | undefined> {
  const gated = findFeaStudies(model.records).filter(s => s.metadata.minSafetyFactor !== undefined);
  if (gated.length === 0) return undefined;

  const diagnostics: CompilerDiagnostic[] = [];
  const summaries: FeaSummary[] = [];
  const skipped: string[] = [];

  if (!gateEnabled()) {
    for (const study of gated) {
      skipped.push(study.metadata.name);
      diagnostics.push({
        target: 'export-occt',
        code: 'fea.solver.unavailable',
        severity: 'warn',
        featureId: study.recordId,
        message:
          `feaStudy '${study.metadata.name}' declares minSafetyFactor ${study.metadata.minSafetyFactor} ` +
          'but KERNELCAD_FEA_GATE=off skipped the solve. The declared margin is UNVERIFIED, not satisfied.',
        hint: HINT_TEMPLATES['fea.solver.unavailable'].template,
      });
    }
    return { diagnostics: withNextActions(diagnostics), summaries, skipped };
  }

  for (const study of gated) {
    const shape = model.shapes.get(study.shapeId);
    if (!(shape instanceof OcctBackend)) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.invalid-args',
        severity: 'error',
        featureId: study.recordId,
        message:
          `feaStudy '${study.metadata.name}' is bound to feature '${study.shapeId}', which produced no lowered solid to analyse.`,
        hint: HINT_TEMPLATES['feature.invalid-args'].template,
      });
      continue;
    }
    const outDir = await mkdtemp(join(tmpdir(), 'kernelcad-fea-gate-'));
    try {
      const r = await runFeaStudy(shape, study.metadata, study.shapeId, model.records, {
        outDir,
        paramTable: model.session.paramTable,
      });
      diagnostics.push(...r.diagnostics);
      if (r.summary !== undefined) summaries.push(r.summary);
    } finally {
      // The gate wants the verdict, not the deck; `run_fea` is the tool that
      // keeps artifacts around for inspection.
      await cleanupJobDir(outDir);
    }
  }

  return { diagnostics: withNextActions(diagnostics), summaries, skipped };
}
