// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/evaluateScript.ts
import {
  dryRunScript,
  evaluateAndBuildScript,
  withIntentLint,
  type EvaluateInput,
  type EvaluateResult,
  type FeatureHealthEntry,
} from '../../cli/commands/evaluate';
import type { SelectionRecord } from '../../../shared/intent/selectionRecord';
import { tubesOutput } from '../../../composition/scriptEvaluation';
import { KernelUnavailableError, resolveKernel } from '../../../modeling/backends/kernelRegistry';
import type { KernelId } from '../../../shared/types/backendTarget';
import type { PortReportEntry } from '../../../modeling/runtime/tube/portReport';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { updateMcpViewer, type McpViewerResult, type McpViewerReview } from '../liveViewer';
import { clearActiveMcpSession, getActiveMcpSession, setActiveMcpSession } from '../activeSession';
import { summarizeScene, unavailableSceneSummary, type SceneSummary } from '../../script-runtime/sceneSummary';
import { Scene } from '../../../modeling/validation/scene';
import type { Assembly } from '../../../modeling/capture/assembly';
import { probeAssemblies } from '../../../modeling/runtime/mechanismProbe';
import { connectorsInSolidDiagnostics } from '../../../modeling/mates/mechanicalPlausibility';
import { checkMotionLoad } from '../../../kinematic/motionLoad';
import { thinSeries } from './checkMotionLoad';
import { withLoadsLine, type MechanismLoadsLine } from '../../../modeling/runtime/mechanismVerdict';
import type { MechanismCoverage } from '../../../modeling/runtime/mechanismTruth';
import {
  needsMechanismVerdict,
  summarizeMechanism,
  type MechanismVerdictSummary,
} from '../../../modeling/runtime/mechanismVerdict';

import { captureStepState, createStepEvidence, type StepEvidence } from './stepEvidence';

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
  /** Solid-modeling kernel. Omitted = 'occt' (the only kernel available
   *  today). Any other value returns ok:false with a
   *  `recompute.kernel.unavailable` diagnostic, on dry and full runs alike. */
  kernel?: KernelId;
  /** Selections of an earlier evaluation of this model (the `selections` field
   *  of its result). Defaults to the previous evaluation of the same `file`. */
  baseline?: SelectionRecord[];
}

export interface EvaluateScriptOutput extends McpViewerResult {
  /** Loopback Studio link, stable across full builds in this MCP process. */
  viewerUrl?: string;
  /** Viewer provisioning failed; the CAD build result is still valid. */
  viewerError?: string;
  step?: StepEvidence;
  sceneSummary: SceneSummary;
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
  /** Dimensions declared with `shape.dimension()`, as the viewer labels them.
   *  Present only on a full evaluation of a script that declares any. */
  dimensions?: NonNullable<EvaluateResult['dimensions']>;
  /** What each feature's selectors bound to: entity kind, surface type,
   *  producing feature, direction, size, centroid. Re-evaluating the same
   *  `file` compares against the previous evaluation and reports
   *  `selector.binding-changed` (a selector now points at a different
   *  entity) or `selector.binding-moved` (same entity, moved or resized).
   *  Absent when no feature used a selector. */
  selections?: NonNullable<EvaluateResult['selections']>;
  /** Tube line report (`lines`: bend table, cut length, clearance, mass, flow;
   *  `systems`: per-system totals). Present only when the model has tubes.
   *  The gate's diagnostics are already in `diagnostics`. */
  tubes?: NonNullable<ReturnType<typeof tubesOutput>>;
  /** Every fluid port of the script's assembly: where it is in assembly
   *  space (params and mates resolved), its system and size, and the tubes
   *  that end on it. Present, possibly empty, on a full evaluation of a
   *  script that declares an assembly. A port whose position cannot be
   *  stated has `unresolved` (why) and no `origin`. */
  ports?: PortReportEntry[];
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
  /**
   * Plain verdict, present when the assembly has moving joints or motion
   * intent (an animation track, a mechanicalJoint drive, a transmission).
   * Absent for a static assembly. `statement` is one line: "Motion checked:
   * ..." names what ran, "Motion not checked: ..." names what was skipped
   * (it is NOT a pass), "Mechanism broken: ..." names the joint.
   */
  mechanismSummary?: MechanismVerdictSummary;
  /**
   * Present ONLY when a captured assembly declares articulated mates (any
   * mate other than `fastened`). The default mechanism gate above is a
   * shallow probe; this names what it does not check and points at
   * `review_cad`, which does.
   */
  reviewHint?: string;
}

/** Text of `reviewHint`. One source for the tool result and its schema docs. */
export const MATES_REVIEW_HINT =
  "This model has articulated mates, and evaluate_script's mechanism check is shallow: it does not check " +
  'joint-support intents, pose-envelope overlap at declared mate limits, or gravity drop / static hold. ' +
  'Run review_cad for pose-envelope + gravity checks before calling the mechanism done.';

async function publishBuiltViewer(model: BuildOutcome['model'], buildSucceeded: boolean, review: McpViewerReview) {
  return buildSucceeded && model ? updateMcpViewer(model, review) : {};
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
 * Full builds update a process-local Studio viewer; no files are written.
 * Full evaluations retain step snapshot artifacts in a temporary directory.
 */
export async function evaluateScriptTool(
  input: EvaluateScriptInput,
): Promise<EvaluateScriptOutput> {
  const kernelRejection = rejectUnavailableKernel(input.kernel);
  if (kernelRejection) return kernelRejection;
  if (input.dryRun) return evaluateDryRun(input);

  const before = capturePreviousStep();
  // Re-evaluating the file the active session was built from: its selections
  // are the baseline, so a selector an edit re-bound is reported.
  const previous = getActiveMcpSession();
  const baseline = input.baseline
    ?? (input.file !== undefined && previous?.file === input.file ? previous.selections : undefined);
  const { evaluation, model, dfmReport, tubeReport, portReport } = await evaluateAndBuildScript(
    { ...(input as EvaluateInput), ...(baseline !== undefined ? { baseline } : {}) },
  );
  // Authoring intent lint (usage triage 2026-10-03): info-only hints naming
  // the API for intent the source states but builds by hand. Agents skip
  // lookup_cookbook, but every agent reads this result.
  const r = withIntentLint(evaluation, model?.code ?? input.code);
  // Session policy: keep/refresh the active session whenever the model
  // BUILD succeeded — even when dfm gate diagnostics made the evaluation
  // fatal (exitCode 1). The dfm hook only runs after a clean build and
  // pushes `dfmReport.diagnostics` into `model.diagnostics` by reference,
  // so the build was clean iff every error-severity diagnostic came from
  // the dfm report. Without this, a dfm-only failure would lock the agent
  // out of the 9 session-dependent tools exactly while iterating on the
  // dfm fix. Genuine build failures (model missing or non-dfm errors)
  // still clear the session — its shapes would be stale or absent.
  const buildSucceeded = didBuildSucceed(model, [dfmReport, tubeReport]);
  refreshActiveSession(model, buildSucceeded, input.file);
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
  const { mechanism, mechanismFailures, coverage } = await probeSceneMechanism(model, buildSucceeded, input.skipMechanismCheck);
  const mechanismSummary = await summaryWithLoads(model, buildSucceeded, { mechanism, mechanismFailures, coverage });

  // Merge mechanism diagnostics into the surfaced list (de-duped against
  // what's already there by reference). Derive `ok` honestly: a 'broken'
  // mechanism makes ok:false; 'unverified' keeps the build/dfm outcome (it
  // is "couldn't verify", not "broken") while still surfacing its loud
  // diagnostic + verdict.
  // Publish gate = review gate: a mate connector far from its part's
  // material is a review_cad error, so it is an evaluate_script error too.
  const connectorErrors = await connectorGate(model, buildSucceeded && input.skipMechanismCheck !== true);
  const { mergedDiagnostics, ok } = gateOutcome(r, mechanism, [...mechanismFailures, ...connectorErrors], connectorErrors.length > 0);
  const tubes = tubesOutput(tubeReport);
  const reviewHint = hasArticulatedMates(model) ? MATES_REVIEW_HINT : undefined;
  const viewer = await publishBuiltViewer(model, buildSucceeded, { mechanism, mechanismFailures, mechanismSummary });

  const after = captureEvaluatedStep(model, buildSucceeded);
  const step = await createStepEvidence(before, after, ok, r.featureHealth);

  return {
    ok,
    ...viewer,
    step,
    sceneSummary: buildSceneSummary(model, buildSucceeded),
    featureCount: r.featureCount,
    // Idempotent re-enrichment guard. evaluateAndBuildScript already
    // populates nextAction on every return path; this wrap is a no-op
    // today but ensures the contract holds if a future caller bypasses
    // the eval helper.
    diagnostics: mergedDiagnostics,
    featureHealth: r.featureHealth,
    ...(r.dimensions !== undefined ? { dimensions: r.dimensions } : {}),
    ...(r.selections !== undefined ? { selections: r.selections } : {}),
    ...(tubes !== undefined ? { tubes } : {}),
    ...(portReport !== undefined ? { ports: portReport } : {}),
    ...(parts !== undefined ? { parts } : {}),
    ...mechanismFields(mechanism, mechanismSummary),
    ...(reviewHint !== undefined ? { reviewHint } : {}),
  };
}

/** The verdict fields, each present only when set. */
function mechanismFields(
  mechanism: SceneMechanism['mechanism'],
  mechanismSummary: MechanismVerdictSummary | undefined,
): Pick<EvaluateScriptOutput, 'mechanism' | 'mechanismSummary'> {
  return {
    ...(mechanism !== undefined ? { mechanism } : {}),
    ...(mechanismSummary !== undefined ? { mechanismSummary } : {}),
  };
}

/** ok:false envelope when `kernel` names a kernel this build cannot run. */
function rejectUnavailableKernel(kernel: unknown): EvaluateScriptOutput | undefined {
  if (kernel === undefined) return undefined;
  try {
    resolveKernel(kernel);
    return undefined;
  } catch (e) {
    if (!(e instanceof KernelUnavailableError)) throw e;
    return {
      ok: false,
      sceneSummary: unavailableSceneSummary(),
      featureCount: 0,
      diagnostics: [e.diagnostic],
      featureHealth: [],
    };
  }
}

type BuildOutcome = Awaited<ReturnType<typeof evaluateAndBuildScript>>;

function capturePreviousStep(): ReturnType<typeof captureStepState> {
  const active = getActiveMcpSession();
  if (!active || active.stepEvidenceSupported === false) return undefined;
  return captureStepState(active.rootShape ?? active.tailShape);
}

function captureEvaluatedStep(model: BuildOutcome['model'], buildSucceeded: boolean): ReturnType<typeof captureStepState> {
  if (!buildSucceeded || !model || Array.isArray(model.returnValue)) return undefined;
  return captureStepState(model.rootShape ?? model.tailShape);
}


/** A policy-gate failure may still have usable geometry; a failed build does not. */
function buildSceneSummary(model: BuildOutcome['model'], buildSucceeded: boolean): SceneSummary {
  if (!buildSucceeded) return unavailableSceneSummary();
  return summarizeScene(model?.rootShape ?? model?.tailShape);
}

async function evaluateDryRun(input: EvaluateScriptInput): Promise<EvaluateScriptOutput> {
  const { evaluation: r, returnValue } = await dryRunScript(input as EvaluateInput);
  const parts = sceneParts(returnValue);
  return {
    ok: r.exitCode === 0,
    dryRun: true,
    sceneSummary: unavailableSceneSummary(),
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

function didBuildSucceed(
  model: BuildOutcome['model'],
  gateReports: ReadonlyArray<{ diagnostics: readonly unknown[] } | undefined>,
): boolean {
  // Tube gate errors are verdicts on a model that built, exactly like dfm ones.
  const gateDiagnostics = new Set<unknown>(gateReports.flatMap(r => r?.diagnostics ?? []));
  // Union-guard errors (union.*) are verdicts on a model that DID build, like
  // dfm gate errors: keep the session and still probe the mechanism so the
  // agent sees every finding at once. `ok` is false via exitCode either way.
  return (
    model !== undefined &&
    model.diagnostics.every(d => d.severity !== 'error' || gateDiagnostics.has(d) || d.code.startsWith('union.'))
  );
}

function refreshActiveSession(model: BuildOutcome['model'], buildSucceeded: boolean, file: string | undefined): void {
  if (buildSucceeded && model !== undefined) {
    setActiveMcpSession({
      ...(file !== undefined ? { file } : {}),
      ...(model.code !== undefined ? { code: model.code } : {}),
      selections: model.selections,
      stepEvidenceSupported: !Array.isArray(model.returnValue),
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

function hasArticulatedMates(model: BuildOutcome['model']): boolean {
  if (model === undefined) return false;
  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  return assemblies.some((a) => a.__mates().some((m) => m.type !== 'fastened'));
}

interface SceneMechanism {
  mechanism?: 'real' | 'broken' | 'unverified';
  mechanismFailures: CompilerDiagnostic[];
  coverage?: MechanismCoverage;
}

async function probeSceneMechanism(
  model: BuildOutcome['model'],
  buildSucceeded: boolean,
  skipMechanismCheck: boolean | undefined,
): Promise<SceneMechanism> {
  if (!buildSucceeded || model === undefined || skipMechanismCheck === true) return { mechanismFailures: [] };
  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  if (assemblies.length === 0) return { mechanismFailures: [] };
  const probe = await probeAssemblies(assemblies);
  return {
    mechanism: probe.mechanism,
    mechanismFailures: [...probe.failures],
    ...(probe.coverage !== undefined ? { coverage: probe.coverage } : {}),
  };
}

/** Surfaced diagnostics and `ok`: a broken mechanism or a gate error fails. */
function gateOutcome(
  r: { diagnostics: CompilerDiagnostic[]; exitCode: number },
  mechanism: SceneMechanism['mechanism'],
  gateFailures: CompilerDiagnostic[],
  gateError: boolean,
): { mergedDiagnostics: CompilerDiagnostic[]; ok: boolean } {
  const base = withNextActions(r.diagnostics);
  return {
    mergedDiagnostics: gateFailures.length > 0 ? [...base, ...withNextActions(gateFailures)] : base,
    ok: r.exitCode === 0 && mechanism !== 'broken' && !gateError,
  };
}

/** `assembly.mechanical.connector-not-in-solid` errors of every captured
 *  assembly, with review_cad's rule and severity. One bounding box per mated
 *  part. skipMechanismCheck opts out of it with the rest of the mechanism
 *  gate. */
async function connectorGate(model: BuildOutcome['model'], buildSucceeded: boolean): Promise<CompilerDiagnostic[]> {
  if (!buildSucceeded || model === undefined) return [];
  const out: CompilerDiagnostic[] = [];
  for (const arm of model.session.assemblies.values() as Iterable<Assembly>) {
    for (const d of await connectorsInSolidDiagnostics(arm)) {
      out.push({ target: 'export-occt', code: d.code, severity: 'error', message: d.message, hint: d.hint });
    }
  }
  return out;
}

/** The verdict plus the short loads line; load diagnostics join the probe's failures. */
async function summaryWithLoads(
  model: BuildOutcome['model'],
  buildSucceeded: boolean,
  probe: SceneMechanism,
): Promise<MechanismVerdictSummary | undefined> {
  const loads = await sceneMotionLoads(model, buildSucceeded, probe.mechanism);
  const base = sceneMechanismSummary(model, buildSucceeded, probe);
  if (loads === undefined) return base;
  probe.mechanismFailures.push(...loads.diagnostics);
  return base === undefined ? base : withLoadsLine(base, loads.line);
}

/** Motion-load line for the badge, only when a mechanicalJoint declares a
 *  torqueNm rating (the study costs one lowering plus a solve per sample). */
async function sceneMotionLoads(
  model: BuildOutcome['model'],
  buildSucceeded: boolean,
  mechanism: SceneMechanism['mechanism'],
): Promise<{ line: MechanismLoadsLine; diagnostics: CompilerDiagnostic[] } | undefined> {
  if (!buildSucceeded || model === undefined || mechanism === undefined) return undefined;
  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  const rated = assemblies.find((a) => a.__mechanicalJointIntents().some((i) => i.torqueNm !== undefined));
  if (rated === undefined) return undefined;
  try {
    const r = await checkMotionLoad(rated);
    const diagnostics = r.diagnostics
      .filter((d) => d.severity !== 'info')
      .map((d): CompilerDiagnostic => ({ target: 'export-occt', code: d.code, severity: d.severity, message: d.message, hint: d.hint, ...(d.nextAction !== undefined ? { nextAction: d.nextAction } : {}) } as CompilerDiagnostic));
    const joints = r.joints.map((j) => {
      const thin = thinSeries(j, 60);
      return {
        joint: j.joint, maxLevel: j.maxLevel, peakTorqueNm: j.peakTorqueNm,
        ...(j.ratedTorqueNm !== undefined ? { ratedTorqueNm: j.ratedTorqueNm } : {}),
        ...(j.torqueMargin !== undefined ? { torqueMargin: j.torqueMargin } : {}),
        peakBendingNmm: j.peakBendingNmm,
        supports: (j.supportLoads ?? []).map((s) => ({ part: s.part, peakRadialN: s.peakRadialN })),
        torque: thin.series.map((s) => [s.tMs ?? 0, s.torqueNm] as const),
      };
    });
    return { line: { maxLevel: r.maxLevel, statement: r.statement.replace(/^Loads checked: /, 'loads: '), joints }, diagnostics };
  } catch (e) {
    return { line: { maxLevel: 'warning', statement: `loads: not checked (${e instanceof Error ? e.message : String(e)}).` }, diagnostics: [] };
  }
}

/** The plain verdict, only for a model that claims to move. An opted-out
 *  probe on such a model reads "Motion not checked", never a silent pass. */
function sceneMechanismSummary(
  model: BuildOutcome['model'],
  buildSucceeded: boolean,
  probe: SceneMechanism,
): MechanismVerdictSummary | undefined {
  if (!buildSucceeded || model === undefined) return undefined;
  const assemblies = Array.from(model.session.assemblies.values()) as Assembly[];
  if (!needsMechanismVerdict(assemblies)) return undefined;
  if (probe.mechanism === undefined) {
    return summarizeMechanism({ mechanism: 'unverified', failures: [], notRunReason: 'skipMechanismCheck was set, so no mechanism check ran' });
  }
  return summarizeMechanism({ mechanism: probe.mechanism, failures: probe.mechanismFailures, coverage: probe.coverage });
}
