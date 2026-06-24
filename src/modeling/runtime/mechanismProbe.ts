// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mechanismProbe.ts
//
// Shared assembly-aggregating wrapper around `checkMechanismTruth`. Used by
// every agent-facing surface that runs the mechanism-truth gate by default
// (CLI `render` / `render inspect`, MCP `evaluate_script`) so the
// cross-assembly verdict precedence and diagnostic aggregation live in ONE
// place rather than being re-derived per call site.
//
// Verdict precedence across assemblies: broken > unverified > real. A single
// broken assembly makes the whole scene broken; absent any broken, a single
// skipped sweep (issue #348 budget) makes the scene unverified; only when
// every assembly is fully verified and clean is the scene 'real'.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { Assembly } from '../capture/assembly';
import { checkMechanismTruth, type MechanismTruthOptions } from './mechanismTruth';

export interface MechanismProbeResult {
  readonly mechanism: 'real' | 'broken' | 'unverified';
  readonly failures: CompilerDiagnostic[];
}

/**
 * Run `checkMechanismTruth` over a set of captured assemblies and fold the
 * per-assembly verdicts into a single scene verdict + aggregated failure
 * list. Returns `{ mechanism: 'unverified', failures: [] }` when there are
 * no assemblies (a non-assembly scene is never "broken" — there is no
 * mechanism to verify; the caller decides whether to surface the field).
 */
export async function probeAssemblies(
  assemblies: readonly Assembly[],
  opts: MechanismTruthOptions = {},
): Promise<MechanismProbeResult> {
  if (assemblies.length === 0) {
    return { mechanism: 'unverified', failures: [] };
  }
  let anyBroken = false;
  let anyUnverified = false;
  const aggregated: CompilerDiagnostic[] = [];
  for (const arm of assemblies) {
    const verdict = await checkMechanismTruth(arm, opts);
    if (verdict.mechanism === 'broken') anyBroken = true;
    else if (verdict.mechanism === 'unverified') anyUnverified = true;
    aggregated.push(...verdict.failures);
  }
  return {
    mechanism: anyBroken ? 'broken' : anyUnverified ? 'unverified' : 'real',
    failures: aggregated,
  };
}
