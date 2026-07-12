// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../cli/commands/evaluate';
import type { Assembly } from '../../modeling/capture/assembly';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../shared/diagnostics/diagnostic';
import {
  summarizeMechanismFitness,
  type MechanismFitnessResult,
} from '../../modeling/mates/mechanismFitness';
import type { GripperApertureRequest } from '../../modeling/mates/gripperAperture';
import type { PoseEnvelopeDiagnostic, PoseEnvelopeReviewResult } from '../../modeling/mates/poseEnvelope';
import { reviewPoseEnvelope } from '../../modeling/mates/poseEnvelope';
import { suggestLimitFix } from '../../modeling/mates/limitFixSuggest';
import {
  reviewMechanicalPlausibility,
  type MechanicalPlausibilityDiagnostic,
} from '../../modeling/mates/mechanicalPlausibility';
import { checkMechanismTruth } from '../../modeling/runtime/mechanismTruth';
import {
  reviewMechanicalIntent,
  type MechanicalIntentDiagnostic,
} from '../../modeling/mates/mechanicalIntent';
import {
  reviewMechanicalTransmission,
  type MechanicalTransmissionDiagnostic,
} from '../../modeling/mates/mechanicalTransmission';
import {
  reviewPhysicalUseCasesWithReachability,
  type PhysicalUseCaseDiagnostic,
  type PhysicalUseCaseJointStructuralCertificate,
} from '../../modeling/mates/physicalUseCase';
import type { PhysicalUseCaseStaticCertificate } from '../../modeling/mates/physicalUseCaseStatics';
import type { PhysicalUseCaseJointReactionCertificate } from '../../modeling/mates/physicalUseCaseJointReactions';
import {
  reviewJointTopology,
  type JointTopologyDiagnostic,
} from '../../modeling/mates/jointTopology';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../modeling/mates/validator';
import { validateAssemblyWithMates } from '../../modeling/mates/validator';
import type { InterferencePair } from '../../modeling/runtime/detectInterferences';
import { detectInterferences } from '../../modeling/runtime/detectInterferences';
import {
  summarizeInterferencePairs,
  type InterferenceSummary,
} from '../../modeling/runtime/interferenceClassification';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import { analyzeContactGraph, type ContactGraphResult } from '../../modeling/runtime/contactGraph';
import type { BuiltModel } from '../../modeling/buildModel';
import { clearActiveMcpSession, setActiveMcpSession } from '../mcp/activeSession';

export interface ReviewCadInput {
  file?: string;
  code?: string;
  assembly?: string;
  designGoal?: string;
  preserveInterfaces?: string[];
  includePoseEnvelope?: boolean;
  includeInterference?: boolean;
  /**
   * P6: run the MuJoCo-based physics gate (criteria 5+6) in addition to
   * the kinematic-only criteria 1-4. Defaults to the same value as
   * `includeInterference` (i.e. heavy-validate flag, opt-in by default
   * for the cheap path). The Studio "validate on save" flow can pass
   * this explicitly; the keystroke-rate recompute does NOT.
   */
  includePhysics?: boolean;
  epsilonMm3?: number;
  trackConnectors?: string[];
  gripperAperture?: GripperApertureRequest;
  samplesPerMate?: number;
  combinatorial?: boolean;
  requirePhysicalUseCase?: boolean;
  includePhysicalUseCaseReachability?: boolean;
  includePhysicalUseCaseStatics?: boolean;
  includePhysicalUseCaseJointReactions?: boolean;
  includePhysicalUseCaseJointStructure?: boolean;
  physicalUseCaseReachabilitySamplesPerMate?: number;
}

export interface RepairContext {
  readonly blockingReasons: readonly string[];
  readonly topDiagnostics: ReadonlyArray<{
    readonly code: string;
    readonly sampleName?: string;
    readonly mateName?: string;
    readonly suggestedDelta?: { mate: string; widenBy?: number; narrowBy?: number };
  }>;
  readonly preserveInterfaces: readonly string[];
  readonly designGoal: string;
}

/**
 * Physics-loop verdict (P1) folded onto every reviewCad result.
 *
 * - `'real'` — the mechanism-truth probe passed at every sampled pose
 * - `'broken'` — at least one criterion failed; `mechanismFailures`
 *               carries the structured list with actionable hints
 * - `'unverified'` — the probe wasn't run (cheap path; no assembly in
 *                    the script, or evaluation failed before lowering)
 *
 * Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md
 */
export type MechanismVerdict = 'real' | 'broken' | 'unverified';

export type ReviewCadOutput =
  | {
      ok: true;
      featureCount: number;
      diagnostics: Array<CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic | MechanicalPlausibilityDiagnostic | MechanicalIntentDiagnostic | MechanicalTransmissionDiagnostic | PhysicalUseCaseDiagnostic | JointTopologyDiagnostic>;
      assembly: string;
      validator: {
        status: ValidatorStatus;
        diagnostics: ValidatorDiagnostic[];
        partCount: number;
        jointCount: number;
      };
      poseEnvelope?: PoseEnvelopeReviewResult;
      connectorWorkspace?: PoseEnvelopeReviewResult['connectorWorkspace'];
      gripperAperture?: PoseEnvelopeReviewResult['gripperAperture'];
      physicalUseCaseStaticCertificates?: readonly PhysicalUseCaseStaticCertificate[];
      physicalUseCaseJointReactionCertificates?: readonly PhysicalUseCaseJointReactionCertificate[];
      physicalUseCaseJointStructuralCertificates?: readonly PhysicalUseCaseJointStructuralCertificate[];
      fitness: MechanismFitnessResult;
      repairContext: RepairContext;
      /**
       * Raw interference pairs detected at the script's default pose, BEFORE
       * any `ignore` filtering applied by the validator. Used by interactive
       * surfaces (e.g. the Studio status-bar HUD) that need to show the user
       * what's overlapping right now, even when the script silences specific
       * pairs via `assembly.solvedModel({ ignore: [...] })`. The validator's
       * filtered diagnostic stream remains on `validator.diagnostics` for the
       * Validity tab + throw path.
       */
      rawInterferencePairs: ReadonlyArray<InterferencePair>;
      interferenceSummary: InterferenceSummary;
      /** Physics-loop verdict (P1). Always present when an assembly was
       *  selected. `'unverified'` when the mechanism probe didn't run. */
      mechanism: MechanismVerdict;
      /** Structured failure list when `mechanism === 'broken'`. Empty
       *  otherwise. */
      mechanismFailures: readonly CompilerDiagnostic[];
      /** Deterministic geometric contact graph of the returned scene:
       *  distinct connected bodies and floating/disconnected parts. Drives
       *  the design-loop's floating-geometry gate. Undefined when the scene
       *  could not be analyzed. */
      geometry?: ContactGraphResult;
    }
  | {
      ok: false;
      featureCount: number;
      diagnostics: Array<CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic | MechanicalPlausibilityDiagnostic | MechanicalIntentDiagnostic | MechanicalTransmissionDiagnostic | PhysicalUseCaseDiagnostic | JointTopologyDiagnostic>;
      assembly?: string;
      validator?: {
        status: ValidatorStatus;
        diagnostics: ValidatorDiagnostic[];
        partCount: number;
        jointCount: number;
      };
      poseEnvelope?: PoseEnvelopeReviewResult;
      connectorWorkspace?: PoseEnvelopeReviewResult['connectorWorkspace'];
      gripperAperture?: PoseEnvelopeReviewResult['gripperAperture'];
      physicalUseCaseStaticCertificates?: readonly PhysicalUseCaseStaticCertificate[];
      physicalUseCaseJointReactionCertificates?: readonly PhysicalUseCaseJointReactionCertificate[];
      physicalUseCaseJointStructuralCertificates?: readonly PhysicalUseCaseJointStructuralCertificate[];
      fitness?: MechanismFitnessResult;
      repairContext: RepairContext;
      suggestedRepairPrompt: string;
      /**
       * Raw interference pairs at the default pose (see the `ok: true`
       * variant). Always present when an assembly was selected, even when
       * `ok: false`, so the Studio HUD can still report the count.
       */
      rawInterferencePairs?: ReadonlyArray<InterferencePair>;
      interferenceSummary?: InterferenceSummary;
      /** Physics-loop verdict (P1). `'unverified'` for pre-build failures
       *  where no assembly reached the probe. */
      mechanism?: MechanismVerdict;
      mechanismFailures?: readonly CompilerDiagnostic[];
      /** Deterministic geometric contact graph (see the `ok: true` variant).
       *  Present whenever a scene was built, even when `ok: false`. */
      geometry?: ContactGraphResult;
    };

type ReviewDiagnostic =
  | CompilerDiagnostic
  | ValidatorDiagnostic
  | PoseEnvelopeDiagnostic
  | MechanicalPlausibilityDiagnostic
  | MechanicalIntentDiagnostic
  | MechanicalTransmissionDiagnostic
  | JointTopologyDiagnostic
  | PhysicalUseCaseDiagnostic;

export const REVIEW_PIPELINE_STAGES = [
  'evaluate-source',
  'select-assembly',
  'default-pose-geometry',
  'mechanical-review',
  'pose-envelope',
  'physical-use-case',
  'mechanism-truth',
  'fitness-and-repair',
] as const;

export type ReviewPipelineStageName = typeof REVIEW_PIPELINE_STAGES[number];

export async function runReviewPipeline(input: ReviewCadInput): Promise<ReviewCadOutput> {
  const { evaluation, model } = await runEvaluateSourceStage(input);
  if (evaluation.exitCode !== 0 || !model) {
    clearActiveMcpSession();
    const diagnostics = withNextActions(evaluation.diagnostics);
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      diagnostics,
      repairContext: await buildRepairContext(undefined, diagnostics, undefined, input),
      suggestedRepairPrompt: buildSuggestedRepairPrompt(diagnostics, undefined, input),
    };
  }

  activateReviewSession(model);

  const { arm, missingAssemblyMessage } = runSelectAssemblyStage(model, input);
  if (!arm) {
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      diagnostics: [],
      repairContext: await buildRepairContext(undefined, [], undefined, input),
      suggestedRepairPrompt: `${missingAssemblyMessage} Return arm.model() or arm.solvedModel(...) from a script that calls assembly(...).`,
    };
  }

  const defaultPoseGeometry = runDefaultPoseGeometryStage(model, input);
  const mechanicalReview = await runMechanicalReviewStage(
    arm,
    input,
    defaultPoseGeometry.rawInterferencePairs,
    defaultPoseGeometry.wantInterference,
  );
  const poseEnvelope = await runPoseEnvelopeStage(arm, input, mechanicalReview.includePoseEnvelope);
  const physicalUseCases = await runPhysicalUseCaseStage(arm, input, poseEnvelope);

  const diagnostics = collectReviewDiagnostics(evaluation, mechanicalReview, physicalUseCases, poseEnvelope);
  const { mechanism, mechanismFailures } = await runMechanismTruthStage(arm, input);

  const { fitness, ok, repairContext } = await runFitnessAndRepairStage({
    arm,
    diagnostics,
    input,
    mechanism,
    mechanicalReview,
    physicalUseCases,
    poseEnvelope,
  });

  if (ok) {
    return {
      ok: true,
      featureCount: evaluation.featureCount,
      diagnostics,
      assembly: arm.name,
      validator: {
        status: mechanicalReview.validator.status,
        diagnostics: [...mechanicalReview.validator.diagnostics],
        partCount: mechanicalReview.validator.partCount,
        jointCount: mechanicalReview.validator.jointCount,
      },
      ...(poseEnvelope !== undefined ? { poseEnvelope } : {}),
      ...(poseEnvelope !== undefined ? { connectorWorkspace: poseEnvelope.connectorWorkspace } : {}),
      ...(poseEnvelope?.gripperAperture !== undefined ? { gripperAperture: poseEnvelope.gripperAperture } : {}),
      physicalUseCaseStaticCertificates: physicalUseCases.staticCertificates,
      physicalUseCaseJointReactionCertificates: physicalUseCases.jointReactionCertificates,
      physicalUseCaseJointStructuralCertificates: physicalUseCases.jointStructuralCertificates,
      fitness,
      repairContext,
      rawInterferencePairs: defaultPoseGeometry.rawInterferencePairs,
      interferenceSummary: defaultPoseGeometry.interferenceSummary,
      mechanism,
      mechanismFailures,
      ...(defaultPoseGeometry.geometry !== undefined ? { geometry: defaultPoseGeometry.geometry } : {}),
    };
  }

  return {
    ok: false,
    featureCount: evaluation.featureCount,
    diagnostics,
    assembly: arm.name,
    validator: {
      status: mechanicalReview.validator.status,
      diagnostics: [...mechanicalReview.validator.diagnostics],
      partCount: mechanicalReview.validator.partCount,
      jointCount: mechanicalReview.validator.jointCount,
    },
    ...(poseEnvelope !== undefined ? { poseEnvelope } : {}),
    ...(poseEnvelope !== undefined ? { connectorWorkspace: poseEnvelope.connectorWorkspace } : {}),
    ...(poseEnvelope?.gripperAperture !== undefined ? { gripperAperture: poseEnvelope.gripperAperture } : {}),
    physicalUseCaseStaticCertificates: physicalUseCases.staticCertificates,
    physicalUseCaseJointReactionCertificates: physicalUseCases.jointReactionCertificates,
    physicalUseCaseJointStructuralCertificates: physicalUseCases.jointStructuralCertificates,
    fitness,
    repairContext,
    suggestedRepairPrompt: buildSuggestedRepairPrompt(diagnostics, fitness, input),
    rawInterferencePairs: defaultPoseGeometry.rawInterferencePairs,
    interferenceSummary: defaultPoseGeometry.interferenceSummary,
    mechanism,
    mechanismFailures,
    ...(defaultPoseGeometry.geometry !== undefined ? { geometry: defaultPoseGeometry.geometry } : {}),
  };
}

async function runEvaluateSourceStage(input: ReviewCadInput) {
  return evaluateForReview(input as EvaluateInput);
}

function activateReviewSession(model: BuiltModel): void {
  setActiveMcpSession({
    session: model.session,
    tailId: model.tailId,
    tailShape: model.tailShape,
    rootId: model.rootId,
    rootShape: model.rootShape,
  });
}

function runSelectAssemblyStage(
  model: BuiltModel,
  input: Pick<ReviewCadInput, 'assembly'>,
): { arm?: Assembly; missingAssemblyMessage: string } {
  const arm = selectAssembly(model.session.assemblies as Map<string, Assembly>, input.assembly);
  const missingAssemblyMessage = input.assembly
    ? `review_cad: assembly '${input.assembly}' not found.`
    : 'review_cad: no assembly captured by the script.';
  return { arm, missingAssemblyMessage };
}

function runDefaultPoseGeometryStage(
  model: BuiltModel,
  input: Pick<ReviewCadInput, 'includeInterference' | 'includePoseEnvelope' | 'epsilonMm3'>,
): {
  wantInterference: boolean;
  rawInterferencePairs: InterferencePair[];
  interferenceSummary: InterferenceSummary;
  geometry?: ContactGraphResult;
} {
  // Raw default-pose interferences are surfaced separately so interactive
  // surfaces (the Studio status-bar HUD) can show the user what's actually
  // overlapping right now, even when the script silences specific pairs via
  // `assembly.solvedModel({ ignore: [...] })`. The validator's diagnostics
  // already respect that ignore list; this channel deliberately does NOT.
  //
  // We reuse `detectInterferencesForPoses` with an empty pose map (default
  // pose). When the script has no live param overrides this matches the
  // capture-time scene exactly; when params are live-edited via the SSE
  // bridge, the session's paramTable carries the live value and detection
  // runs against the current pose. That's what makes the HUD count update on
  // slider drag.
  //
  // Respect `includeInterference: false` (and `includePoseEnvelope: false`
  // when `includeInterference` is unset) to preserve back-compat with
  // existing callers — notably the integration test fixtures that
  // deliberately build clashing assemblies to exercise other validators.
  // The default flow (both unset) runs detection so the Studio HUD sees real
  // overlaps; opt-out paths skip it. The legacy "blind to overlaps"
  // behaviour is preserved when either flag explicitly disables interference
  // work.
  const wantInterference =
    input.includeInterference !== undefined
      ? input.includeInterference
      : input.includePoseEnvelope !== false;
  const rawInterferencePairs = wantInterference
    ? safeDetectDefaultPoseInterferences(model, input.epsilonMm3)
    : [];
  return {
    wantInterference,
    rawInterferencePairs,
    interferenceSummary: summarizeInterferencePairs(rawInterferencePairs),
    geometry: safeAnalyzeContactGraph(model),
  };
}

async function runMechanicalReviewStage(
  arm: Assembly,
  input: Pick<ReviewCadInput, 'includePoseEnvelope'>,
  rawInterferencePairs: readonly InterferencePair[],
  wantInterference: boolean,
) {
  const validator = await validateAssemblyWithMates(
    arm,
    wantInterference ? rawInterferencePairs : undefined,
    undefined,
    undefined,
    undefined,
    arm.__ignoreInterference(),
  );
  const mechanicalPlausibility = await reviewMechanicalPlausibility(arm);
  const mechanicalIntent = await reviewMechanicalIntent(arm);
  const includePoseEnvelope = input.includePoseEnvelope ?? true;
  const mechanicalTransmission = await reviewMechanicalTransmission(arm, { includePoseEnvelope });
  const jointTopology = reviewJointTopology(arm);
  return {
    validator,
    mechanicalPlausibility,
    mechanicalIntent,
    mechanicalTransmission,
    jointTopology,
    includePoseEnvelope,
  };
}

async function runPoseEnvelopeStage(
  arm: Assembly,
  input: Pick<ReviewCadInput, 'includeInterference' | 'epsilonMm3' | 'trackConnectors' | 'gripperAperture' | 'samplesPerMate' | 'combinatorial'>,
  includePoseEnvelope: boolean,
): Promise<PoseEnvelopeReviewResult | undefined> {
  return includePoseEnvelope
    ? reviewPoseEnvelope(arm, {
        includeInterference: input.includeInterference ?? true,
        epsilonMm3: input.epsilonMm3,
        trackConnectors: mergeConnectorRefs(input.trackConnectors, physicalUseCaseConnectorRefs(arm)),
        gripperAperture: input.gripperAperture,
        samplesPerMate: input.samplesPerMate,
        combinatorial: input.combinatorial,
      })
    : undefined;
}

async function runPhysicalUseCaseStage(
  arm: Assembly,
  input: Pick<
    ReviewCadInput,
    | 'requirePhysicalUseCase'
    | 'includePhysicalUseCaseReachability'
    | 'includePhysicalUseCaseStatics'
    | 'includePhysicalUseCaseJointReactions'
    | 'includePhysicalUseCaseJointStructure'
    | 'physicalUseCaseReachabilitySamplesPerMate'
  >,
  poseEnvelope: PoseEnvelopeReviewResult | undefined,
) {
  const includeReachability =
    input.includePhysicalUseCaseReachability ?? input.requirePhysicalUseCase === true;
  return reviewPhysicalUseCasesWithReachability(arm, {
    requirePhysicalUseCase: input.requirePhysicalUseCase,
    poseEnvelope,
    includeReachability,
    includeStatics: input.includePhysicalUseCaseStatics,
    includeJointReactions: input.includePhysicalUseCaseJointReactions,
    includeJointStructure: input.includePhysicalUseCaseJointStructure,
    reachabilitySamplesPerMate: input.physicalUseCaseReachabilitySamplesPerMate,
  });
}

function collectReviewDiagnostics(
  evaluation: Awaited<ReturnType<typeof evaluateForReview>>['evaluation'],
  mechanicalReview: Awaited<ReturnType<typeof runMechanicalReviewStage>>,
  physicalUseCases: Awaited<ReturnType<typeof runPhysicalUseCaseStage>>,
  poseEnvelope: PoseEnvelopeReviewResult | undefined,
): ReviewDiagnostic[] {
  return [
    ...withNextActions(evaluation.diagnostics),
    ...mechanicalReview.jointTopology.diagnostics,
    ...mechanicalReview.validator.diagnostics,
    ...mechanicalReview.mechanicalPlausibility.diagnostics,
    ...mechanicalReview.mechanicalIntent.diagnostics,
    ...mechanicalReview.mechanicalTransmission.diagnostics,
    ...physicalUseCases.diagnostics,
    ...(poseEnvelope?.diagnostics ?? []),
  ];
}

async function runMechanismTruthStage(
  arm: Assembly,
  input: Pick<ReviewCadInput, 'includeInterference' | 'includePoseEnvelope' | 'includePhysics'>,
): Promise<{ mechanism: MechanismVerdict; mechanismFailures: readonly CompilerDiagnostic[] }> {
  // Physics-loop probe (P1 surface convergence). Same gating shape as
  // wantInterference above — opt-out only when the caller explicitly
  // disables heavy work (includePoseEnvelope: false defaults the
  // mechanism probe off too, mirroring the existing convention where
  // envelope sampling and interference detection move together). Cheap
  // review calls (Studio param drags, eval harness rest-pose checks)
  // skip the pose sweep this way. The probe's broken-mechanism verdict
  // gates the fitness summary below: a broken mechanism cannot be
  // functional no matter what the legacy fitness checks say.
  const wantMechanism =
    input.includeInterference !== undefined
      ? input.includeInterference
      : input.includePoseEnvelope !== false;
  if (!wantMechanism) {
    return { mechanism: 'unverified', mechanismFailures: [] };
  }

  // Physics opt-in mirrors interference opt-in by default. The Studio
  // recompute layer can override by passing `includePhysics: false`
  // explicitly to keep the keystroke-rate path off MuJoCo even when
  // it asks for the kinematic check.
  const physicsCheck = input.includePhysics === undefined
    ? wantMechanism
    : input.includePhysics;
  try {
    const verdict = await checkMechanismTruth(arm, { physicsCheck });
    // Preserve 'unverified' (e.g. a skipped BREP sweep, issue #348) —
    // don't collapse it to 'real'.
    return {
      mechanism: verdict.mechanism,
      mechanismFailures: verdict.failures,
    };
  } catch {
    // Probe-side throw — surface as unverified so the legacy review
    // path still produces actionable output; the CLI handles the same
    // case symmetrically.
    return { mechanism: 'unverified', mechanismFailures: [] };
  }
}

async function runFitnessAndRepairStage(input: {
  arm: Assembly;
  diagnostics: readonly ReviewDiagnostic[];
  input: ReviewCadInput;
  mechanism: MechanismVerdict;
  mechanicalReview: Awaited<ReturnType<typeof runMechanicalReviewStage>>;
  physicalUseCases: Awaited<ReturnType<typeof runPhysicalUseCaseStage>>;
  poseEnvelope: PoseEnvelopeReviewResult | undefined;
}): Promise<{ fitness: MechanismFitnessResult; ok: boolean; repairContext: RepairContext }> {
  const fitness = summarizeMechanismFitness({
    validatorDiagnostics: input.mechanicalReview.validator.diagnostics,
    mechanicalPlausibilityDiagnostics: input.mechanicalReview.mechanicalPlausibility.diagnostics,
    mechanicalIntentDiagnostics: input.mechanicalReview.mechanicalIntent.diagnostics,
    mechanicalTransmissionDiagnostics: input.mechanicalReview.mechanicalTransmission.diagnostics,
    jointTopologyDiagnostics: input.mechanicalReview.jointTopology.diagnostics,
    physicalUseCaseDiagnostics: input.physicalUseCases.diagnostics,
    physicalUseCaseCount: input.physicalUseCases.checkedUseCaseCount,
    poseEnvelope: input.poseEnvelope,
    trackConnectors: input.poseEnvelope !== undefined ? input.input.trackConnectors : undefined,
  });
  // A broken mechanism overrides a "functional" fitness summary —
  // the loop's truth criterion is the merge gate, not the legacy
  // advisory aggregate. Spec §"the recompute is what defines the
  // passing state".
  const ok = fitness.functional && input.mechanism !== 'broken';
  return {
    fitness,
    ok,
    repairContext: await buildRepairContext(input.arm, input.diagnostics, fitness, input.input),
  };
}

/**
 * Deterministic geometric contact graph of the script's returned scene.
 * Mirrors safeDetectDefaultPoseInterferences: reads the lowered scene of the
 * script's return value and never lets a kernel failure sink the whole review
 * — geometry is simply reported as undefined in that case.
 */
function safeAnalyzeContactGraph(model: BuiltModel): ContactGraphResult | undefined {
  try {
    const tail = model.rootShape ?? model.tailShape;
    if (!tail || !isSceneBackend(tail)) return undefined;
    if (tail.parts.length < 2) return undefined;
    return analyzeContactGraph(tail);
  } catch {
    return undefined;
  }
}

function physicalUseCaseConnectorRefs(arm: Assembly): string[] {
  const refs = new Set<string>();
  for (const useCase of arm.__physicalUseCases()) {
    for (const contact of useCase.contacts) {
      refs.add(contact.a);
      refs.add(contact.b);
    }
  }
  return [...refs];
}

function mergeConnectorRefs(
  explicitRefs: readonly string[] | undefined,
  inferredRefs: readonly string[],
): string[] | undefined {
  if (explicitRefs === undefined && inferredRefs.length === 0) return undefined;
  return [...new Set([...(explicitRefs ?? []), ...inferredRefs])];
}

/**
 * Run pairwise BREP interference detection on the BuiltModel's lowered
 * scene for the Studio HUD's raw-count channel. We deliberately read the
 * lowered scene of the script's RETURN value (`model.rootShape`, falling
 * back to `model.tailShape` — the scene returned by the script's own
 * `arm.solvedModel(poses, ...)`) instead of calling
 * `detectInterferencesForPoses(arm, {})` — the latter re-records a new
 * `solvedAssembly` with EMPTY poses, which trips the lowerer's
 * "joint requires a pose value" check for revolute/prismatic joints and
 * silently returns []. The script's already-built scene carries the
 * script's authored param defaults (the same ones the Studio render is
 * showing), so reading them gives the user-visible state.
 *
 * Wrapped in try/catch so a kernel failure on a single detection can't
 * bring down the entire review tool — the HUD just shows
 * `interferences: 0` in that case and the validator's other diagnostics
 * continue to surface the real problem.
 */
function safeDetectDefaultPoseInterferences(
  model: BuiltModel,
  epsilonMm3?: number,
): InterferencePair[] {
  try {
    const tail = model.rootShape ?? model.tailShape;
    if (!tail || !isSceneBackend(tail)) return [];
    const epsilon = epsilonMm3 ?? 0.01;
    return detectInterferences(tail, epsilon, new Set<string>()).pairs;
  } catch {
    return [];
  }
}

async function evaluateForReview(input: EvaluateInput) {
  const priorDefault = process.env.KERNELCAD_VALIDATE_DEFAULT;
  if (priorDefault === undefined) {
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'warn';
  }
  try {
    return await evaluateAndBuildScript(input);
  } finally {
    if (priorDefault === undefined) {
      delete process.env.KERNELCAD_VALIDATE_DEFAULT;
    } else {
      process.env.KERNELCAD_VALIDATE_DEFAULT = priorDefault;
    }
  }
}

function selectAssembly(
  assemblies: Map<string, Assembly>,
  name?: string,
): Assembly | undefined {
  return name !== undefined
    ? assemblies.get(name)
    : assemblies.values().next().value;
}

function severityRank(diag: ReviewDiagnostic): number {
  // CompilerDiagnostic uses 'warn'; structured diagnostics use 'warning'. Both
  // are warning-tier and sort below 'error'. 'info' (validator-only) sorts last.
  switch (diag.severity) {
    case 'error':
      return 0;
    case 'warning':
    case 'warn':
      return 1;
    default:
      return 2;
  }
}

function diagnosticMateName(diag: ReviewDiagnostic): string | undefined {
  return 'mateName' in diag && typeof diag.mateName === 'string' ? diag.mateName : undefined;
}

function diagnosticSampleName(diag: ReviewDiagnostic): string | undefined {
  return 'sampleName' in diag && typeof diag.sampleName === 'string' ? diag.sampleName : undefined;
}

function diagnosticVolume(diag: ReviewDiagnostic): number | undefined {
  return 'volumeMm3' in diag && typeof diag.volumeMm3 === 'number' ? diag.volumeMm3 : undefined;
}

function compareDiagnostics(a: ReviewDiagnostic, b: ReviewDiagnostic): number {
  // Severity DESC (error first), then volumeMm3 DESC (where present),
  // then stable lex order on code, then on sampleName.
  const sevDelta = severityRank(a) - severityRank(b);
  if (sevDelta !== 0) return sevDelta;
  const va = diagnosticVolume(a);
  const vb = diagnosticVolume(b);
  if (va !== undefined || vb !== undefined) {
    if (va === undefined) return 1;   // entries with volume sort first
    if (vb === undefined) return -1;
    if (vb !== va) return vb - va;
  }
  if (a.code !== b.code) return a.code < b.code ? -1 : 1;
  const sa = diagnosticSampleName(a) ?? '';
  const sb = diagnosticSampleName(b) ?? '';
  if (sa !== sb) return sa < sb ? -1 : 1;
  return 0;
}

async function computeSuggestedDelta(
  arm: Assembly | undefined,
  diag: ReviewDiagnostic,
): Promise<{ mate: string; widenBy?: number; narrowBy?: number } | undefined> {
  if (diag.code !== 'assembly.pose.out-of-limits') return undefined;
  const mateName = diagnosticMateName(diag);
  if (mateName === undefined) return undefined;

  // For out-of-limits the diagnostic carries the static pose and declared
  // limits; the repair is to widen the bound the pose crossed. Direct
  // computation here keeps semantics correct (suggestLimitFix only narrows,
  // and bails on sampleName='current' which is what out-of-limits emits).
  const pose = 'pose' in diag ? diag.pose : undefined;
  const limits = 'limits' in diag ? diag.limits : undefined;
  if (typeof pose === 'number' && Array.isArray(limits) && limits.length === 2) {
    const [min, max] = limits as readonly [number, number];
    if (pose > max) return { mate: mateName, widenBy: pose - max };
    if (pose < min) return { mate: mateName, widenBy: min - pose };
  }

  // Fall back to suggestLimitFix for diagnostics that name a :min/:max sample
  // (won't fire for the current out-of-limits path but kept for completeness
  // should the diagnostic shape change).
  if (arm !== undefined) {
    const fix = await suggestLimitFix(arm, diag as PoseEnvelopeDiagnostic);
    if (fix !== null) {
      const [oMin, oMax] = fix.originalLimits;
      const [nMin, nMax] = fix.limits;
      if (fix.shrunkBound === 'max') {
        return { mate: fix.mateName, narrowBy: oMax - nMax };
      }
      if (fix.shrunkBound === 'min') {
        return { mate: fix.mateName, narrowBy: nMin - oMin };
      }
    }
  }

  return undefined;
}

async function buildRepairContext(
  arm: Assembly | undefined,
  diagnostics: readonly ReviewDiagnostic[],
  fitness: MechanismFitnessResult | undefined,
  input: Pick<ReviewCadInput, 'designGoal' | 'preserveInterfaces'>,
): Promise<RepairContext> {
  const blockingReasons = (fitness?.blockingReasons ?? []).map(
    (reason) => `${reason.code}: ${reason.message}`,
  );
  const sorted = [...diagnostics].sort(compareDiagnostics).slice(0, 3);
  const topDiagnostics = await Promise.all(
    sorted.map(async (diag) => {
      const entry: {
        code: string;
        sampleName?: string;
        mateName?: string;
        suggestedDelta?: { mate: string; widenBy?: number; narrowBy?: number };
      } = { code: diag.code };
      const sample = diagnosticSampleName(diag);
      if (sample !== undefined) entry.sampleName = sample;
      const mate = diagnosticMateName(diag);
      if (mate !== undefined) entry.mateName = mate;
      const delta = await computeSuggestedDelta(arm, diag);
      if (delta !== undefined) entry.suggestedDelta = delta;
      return entry;
    }),
  );
  return {
    blockingReasons,
    topDiagnostics,
    preserveInterfaces: input.preserveInterfaces ?? [],
    designGoal: input.designGoal ?? '',
  };
}

function buildSuggestedRepairPrompt(
  diagnostics: readonly ReviewDiagnostic[],
  fitness?: MechanismFitnessResult,
  input?: Pick<ReviewCadInput, 'designGoal' | 'preserveInterfaces'>,
): string {
  const blockingReasons = fitness?.blockingReasons ?? [];
  if (diagnostics.length === 0 && blockingReasons.length === 0) {
    return 'No structured diagnostics were produced. Re-run review_cad after returning an assembly scene from the script.';
  }
  // Filter out non-actionable informational diagnostics. The prompt has a
  // bounded evidence budget, so make room for every distinct blocker before
  // repeating lower-level instances of the same diagnostic code.
  const actionableDiagnostics = diagnostics.filter((d) =>
    'severity' in d ? d.severity !== 'info' : true,
  );
  const factCandidates = [
    ...blockingReasons.map((reason) => ({
      code: reason.code,
      fact: `- ${reason.code}: ${reason.message} Hint: ${reason.repairHint}`,
    })),
    ...actionableDiagnostics.map((diagnostic) => {
      const scoped = 'sampleName' in diagnostic && diagnostic.sampleName
        ? ` [${diagnostic.sampleName}]`
        : '';
      return {
        code: diagnostic.code,
        fact: `- ${diagnostic.code}${scoped}: ${diagnostic.message} Hint: ${diagnostic.hint}`,
      };
    }),
  ];
  const facts: string[] = [];
  const includedCodes = new Set<string>();
  const includedFacts = new Set<string>();

  // First pass: a concise causal map. A missing transmission, for example,
  // must remain visible even when several support diagnostics precede it.
  for (const candidate of factCandidates) {
    if (facts.length === 8) break;
    if (includedCodes.has(candidate.code)) continue;
    facts.push(candidate.fact);
    includedCodes.add(candidate.code);
    includedFacts.add(candidate.fact);
  }
  // Second pass: add mate- or pose-specific detail when the bounded prompt
  // still has room, without repeating the same evidence verbatim.
  for (const candidate of factCandidates) {
    if (facts.length === 8) break;
    if (includedFacts.has(candidate.fact)) continue;
    facts.push(candidate.fact);
    includedFacts.add(candidate.fact);
  }
  const repairDirective = fitness === undefined
    ? ''
    : `\nRepair mode: ${fitness.repairMode}\nDirective: ${fitness.repairDirective}\n`;
  const designContext = [
    input?.designGoal ? `Design goal: ${input.designGoal}` : undefined,
    input?.preserveInterfaces?.length ? `Preserve interfaces: ${input.preserveInterfaces.join(', ')}` : undefined,
  ].filter((line): line is string => line !== undefined);
  const designBlock = designContext.length === 0 ? '' : `\n${designContext.join('\n')}\n`;
  return `Repair the kernelCAD script using these deterministic review facts:${repairDirective}${designBlock}\n${facts.join('\n')}`;
}
