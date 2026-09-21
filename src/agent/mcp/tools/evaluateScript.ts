// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/evaluateScript.ts
import {
  dryRunScript,
  evaluateAndBuildScript,
  type EvaluateInput,
  type FeatureHealthEntry,
} from '../../cli/commands/evaluate';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { clearActiveMcpSession, setActiveMcpSession } from '../activeSession';
import { Scene } from '../../../modeling/validation/scene';
import type { Assembly } from '../../../modeling/capture/assembly';
import { probeAssemblies } from '../../../modeling/runtime/mechanismProbe';

export interface EvaluateScriptInput {
  file?: string;
  code?: string;
  /** Fast validation mode: transpile + capture + capture-light checks +
   *  diagnostics WITHOUT the OCCT lowering pass, DFM gates, or meshing.
   *  Catches script throws, capture-time API misuse, and assembly
   *  validity-gate failures; does NOT catch lowering failures (failed
   *  booleans, oversized fillets) or `dfmSpec` diagnostics. Leaves the
   *  active MCP session untouched (neither set nor cleared). */
  dryRun?: boolean;
  /**
   * Opt OUT of the default mechanism-truth gate (T3). By default a full
   * (non-dry) evaluation of an assembly-built scene runs
   * `checkMechanismTruth` and folds the verdict into `ok` + `mechanism` +
   * `diagnostics`. Pass `true` to skip that probe entirely — no
   * `mechanism` field, no sweep cost. Use only when you've already
   * verified the mechanism or are iterating on non-kinematic geometry.
   * Ignored for `dryRun` (which never probes) and for non-assembly
   * scripts (which have no mechanism to verify).
   */
  skipMechanismCheck?: boolean;
}

export interface EvaluateScriptOutput {
  ok: boolean;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
  /** Echoed `true` when the run was a dry run (capture-only validation —
   *  no geometry was lowered and the active session was not touched). */
  dryRun?: true;
  /**
   * Present ONLY when the evaluated scene is assembly-built
   * (`assembly().part(...)` → `.model()` / `.solvedModel()`). Carries the
   * part count and ordered part names so agents can confirm the model
   * structured its bodies as named parts. Absent for single-shape /
   * non-assembly scripts.
   */
  parts?: { count: number; names: string[] };
  /**
   * Per-feature health degradations from the recompute pass — a lean list of
   * ONLY the features that degraded. Each entry is
   * `{ featureId, status: 'warning' | 'error' }`. A fully-healthy model
   * returns `[]` (healthy features are never listed). This lets an agent see
   * WHICH feature degraded — e.g. a feature that silently fell back to a
   * passthrough because a gated-off upstream removed its target face — even
   * when the overall `ok` is still `true`. Walk a flagged feature with
   * `why_did_this_fail` for the upstream root cause. Dry runs skip lowering,
   * so this is always `[]` for `dryRun: true`.
   */
  featureHealth: FeatureHealthEntry[];
  /**
   * Mechanism-truth verdict (T3), present ONLY for a full (non-dry)
   * evaluation of an assembly-built scene with `skipMechanismCheck` unset.
   *   - 'real'       — every criterion held at every sampled pose.
   *   - 'broken'     — a definitive failure (self-collision, fastened
   *                    drift, dof-mismatch, …); makes `ok: false`.
   *   - 'unverified' — the articulated sweep was skipped (budget); `ok`
   *                    is left as the build/dfm outcome and a loud
   *                    `mechanism.unverified-budget-exceeded` diagnostic
   *                    is surfaced. "Couldn't verify", not "broken".
   * Mechanism failure diagnostics are merged into `diagnostics`.
   */
  mechanism?: 'real' | 'broken' | 'unverified';
}

/**
 * MCP `evaluate_script` tool — runs a kernelCAD script and reports
 * pass/fail + feature count + diagnostics, plus a `parts` summary
 * (`{ count, names }`) when the scene is assembly-built. One-of `{ file }`
 * (path on disk) or `{ code }` (inline source). Returns a JSON-serializable
 * envelope agents can reason over.
 *
 * With `dryRun: true` the script is transpiled + captured but never lowered:
 * no OCCT booleans, no DFM gates, no meshing. Use it to iterate cheaply on
 * script validity before paying for a full evaluation. Dry runs do not
 * produce lowered shapes, so the active MCP session is left untouched —
 * session-dependent tools keep whatever full evaluation ran last.
 *
 * No side effects — does not write to disk.
 */
export async function evaluateScriptTool(
  input: EvaluateScriptInput,
): Promise<EvaluateScriptOutput> {
  if (input.dryRun) return evaluateDryRun(input);

  const { evaluation: r, model, dfmReport } = await evaluateAndBuildScript(input as EvaluateInput);
  // Session policy: keep/refresh the active session whenever the model
  // BUILD succeeded — even when dfm gate diagnostics made the evaluation
  // fatal (exitCode 1). The dfm hook only runs after a clean build and
  // pushes `dfmReport.diagnostics` into `model.diagnostics` by reference,
  // so the build was clean iff every error-severity diagnostic came from
  // the dfm report. Without this, a dfm-only failure would lock the agent
  // out of the 9 session-dependent tools exactly while iterating on the
  // dfm fix. Genuine build failures (model missing or non-dfm errors)
  // still clear the session — its shapes would be stale or absent.
  const buildSucceeded = didBuildSucceed(model, dfmReport);
  refreshActiveSession(model, buildSucceeded);
  // Assembly-built scene: surface the named-part roster so agents can
  // confirm the model carries part identity. Absent for single-shape /
  // non-assembly returns.
  const parts = sceneParts(model?.returnValue);

  // T3 — mechanism verify BY DEFAULT on the agent path. An agent calling
  // evaluate_script on an assembly used to get ok:true even when the
  // mechanism self-collides / disconnects; `ok` is now a function of the
  // verified post-state. Runs only on a successful build of an
  // assembly-built scene, and only when not opted out. Non-assembly
  // scripts and dry runs never pay the cost and carry no `mechanism` field.
  //
  // NOTE: this is the agent-facing surface ONLY. The RecomputeEngine
  // recompute path (Studio's per-keystroke lower) deliberately does NOT run
  // this sweep and is untouched here.
  const { mechanism, mechanismFailures } = await probeSceneMechanism(model, buildSucceeded, input.skipMechanismCheck);

  // Merge mechanism diagnostics into the surfaced list (de-duped against
  // what's already there by reference). Derive `ok` honestly: a 'broken'
  // mechanism makes ok:false; 'unverified' keeps the build/dfm outcome (it
  // is "couldn't verify", not "broken") while still surfacing its loud
  // diagnostic + verdict.
  const baseDiagnostics = withNextActions(r.diagnostics);
  const mergedDiagnostics =
    mechanismFailures.length > 0
      ? [...baseDiagnostics, ...withNextActions(mechanismFailures)]
      : baseDiagnostics;
  const ok = r.exitCode === 0 && mechanism !== 'broken';

  return {
    ok,
    featureCount: r.featureCount,
    // Idempotent re-enrichment guard. evaluateAndBuildScript already
    // populates nextAction on every return path; this wrap is a no-op
    // today but ensures the contract holds if a future caller bypasses
    // the eval helper.
    diagnostics: mergedDiagnostics,
    featureHealth: r.featureHealth,
    ...(parts !== undefined ? { parts } : {}),
    ...(mechanism !== undefined ? { mechanism } : {}),
  };
}

type BuildOutcome = Awaited<ReturnType<typeof evaluateAndBuildScript>>;

async function evaluateDryRun(input: EvaluateScriptInput): Promise<EvaluateScriptOutput> {
  const { evaluation: r, returnValue } = await dryRunScript(input as EvaluateInput);
  const parts = sceneParts(returnValue);
  return {
    ok: r.exitCode === 0,
    dryRun: true,
    featureCount: r.featureCount,
    diagnostics: withNextActions(r.diagnostics),
    featureHealth: r.featureHealth,
    ...(parts !== undefined ? { parts } : {}),
  };
}

function sceneParts(returnValue: unknown): { count: number; names: string[] } | undefined {
  return returnValue instanceof Scene
    ? { count: returnValue.parts.length, names: returnValue.parts.map(p => p.name) }
    : undefined;
}

function didBuildSucceed(model: BuildOutcome['model'], dfmReport: BuildOutcome['dfmReport']): boolean {
  const dfmErrors = new Set(dfmReport?.diagnostics ?? []);
  return (
    model !== undefined &&
    model.diagnostics.every(d => d.severity !== 'error' || dfmErrors.has(d))
  );
}

function refreshActiveSession(model: BuildOutcome['model'], buildSucceeded: boolean): void {
  if (buildSucceeded && model !== undefined) {
    setActiveMcpSession({
      session: model.session,
      tailId: model.tailId,
      tailShape: model.tailShape,
      rootId: model.rootId,
      rootShape: model.rootShape,
    });
  } else {
    clearActiveMcpSession();
  }
}

async function probeSceneMechanism(
  model: BuildOutcome['model'],
  buildSucceeded: boolean,
  skipMechanismCheck: boolean | undefined,
): Promise<{ mechanism?: 'real' | 'broken' | 'unverified'; mechanismFailures: CompilerDiagnostic[] }> {
  let mechanism: 'real' | 'broken' | 'unverified' | undefined;
  const mechanismFailures: CompilerDiagnostic[] = [];
  if (buildSucceeded && model !== undefined && skipMechanismCheck !== true) {
    const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
    if (assemblies.length > 0) {
      const probe = await probeAssemblies(assemblies);
      mechanism = probe.mechanism;
      mechanismFailures.push(...probe.failures);
    }
  }
  return { mechanism, mechanismFailures };
}
