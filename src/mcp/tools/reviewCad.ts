import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../capture/assembly';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { withNextActions } from '../../diagnostics/diagnostic';
import {
  summarizeMechanismFitness,
  type MechanismFitnessResult,
} from '../../lib/mates/mechanismFitness';
import type { GripperApertureRequest } from '../../lib/mates/gripperAperture';
import type { PoseEnvelopeDiagnostic, PoseEnvelopeReviewResult } from '../../lib/mates/poseEnvelope';
import { reviewPoseEnvelope } from '../../lib/mates/poseEnvelope';
import {
  reviewMechanicalPlausibility,
  type MechanicalPlausibilityDiagnostic,
} from '../../lib/mates/mechanicalPlausibility';
import {
  reviewMechanicalIntent,
  type MechanicalIntentDiagnostic,
} from '../../lib/mates/mechanicalIntent';
import {
  reviewMechanicalTransmission,
  type MechanicalTransmissionDiagnostic,
} from '../../lib/mates/mechanicalTransmission';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../lib/mates/validator';
import { validateAssemblyWithMates } from '../../lib/mates/validator';
import { clearActiveMcpSession, setActiveMcpSession } from '../activeSession';

export interface ReviewCadInput {
  file?: string;
  code?: string;
  assembly?: string;
  designGoal?: string;
  preserveInterfaces?: string[];
  includePoseEnvelope?: boolean;
  includeInterference?: boolean;
  epsilonMm3?: number;
  trackConnectors?: string[];
  gripperAperture?: GripperApertureRequest;
}

export type ReviewCadOutput =
  | {
      ok: true;
      featureCount: number;
      diagnostics: Array<CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic | MechanicalPlausibilityDiagnostic | MechanicalIntentDiagnostic | MechanicalTransmissionDiagnostic>;
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
      fitness: MechanismFitnessResult;
    }
  | {
      ok: false;
      featureCount: number;
      diagnostics: Array<CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic | MechanicalPlausibilityDiagnostic | MechanicalIntentDiagnostic | MechanicalTransmissionDiagnostic>;
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
      fitness?: MechanismFitnessResult;
      suggestedRepairPrompt: string;
    };

export async function reviewCadTool(input: ReviewCadInput): Promise<ReviewCadOutput> {
  const { evaluation, model } = await evaluateForReview(input as EvaluateInput);
  if (evaluation.exitCode !== 0 || !model) {
    clearActiveMcpSession();
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      diagnostics: withNextActions(evaluation.diagnostics),
      suggestedRepairPrompt: buildSuggestedRepairPrompt(withNextActions(evaluation.diagnostics), undefined, input),
    };
  }

  setActiveMcpSession({
    session: model.session,
    tailId: model.tailId,
    tailShape: model.tailShape,
  });

  const arm = selectAssembly(model.session.assemblies as Map<string, Assembly>, input.assembly);
  if (!arm) {
    const message = input.assembly
      ? `review_cad: assembly '${input.assembly}' not found.`
      : 'review_cad: no assembly captured by the script.';
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      diagnostics: [],
      suggestedRepairPrompt: `${message} Return arm.model() or arm.solvedModel(...) from a script that calls assembly(...).`,
    };
  }

  const validator = await validateAssemblyWithMates(arm);
  const mechanicalPlausibility = await reviewMechanicalPlausibility(arm);
  const mechanicalIntent = await reviewMechanicalIntent(arm);
  const includePoseEnvelope = input.includePoseEnvelope ?? true;
  const mechanicalTransmission = await reviewMechanicalTransmission(arm, { includePoseEnvelope });
  const poseEnvelope = includePoseEnvelope
    ? await reviewPoseEnvelope(arm, {
        includeInterference: input.includeInterference ?? true,
        epsilonMm3: input.epsilonMm3,
        trackConnectors: input.trackConnectors,
        gripperAperture: input.gripperAperture,
      })
    : undefined;

  const diagnostics = [
    ...withNextActions(evaluation.diagnostics),
    ...validator.diagnostics,
    ...mechanicalPlausibility.diagnostics,
    ...mechanicalIntent.diagnostics,
    ...mechanicalTransmission.diagnostics,
    ...(poseEnvelope?.diagnostics ?? []),
  ];
  const fitness = summarizeMechanismFitness({
    validatorDiagnostics: validator.diagnostics,
    mechanicalPlausibilityDiagnostics: mechanicalPlausibility.diagnostics,
    mechanicalIntentDiagnostics: mechanicalIntent.diagnostics,
    mechanicalTransmissionDiagnostics: mechanicalTransmission.diagnostics,
    poseEnvelope,
    trackConnectors: poseEnvelope !== undefined ? input.trackConnectors : undefined,
  });
  const ok = fitness.functional;

  if (ok) {
    return {
      ok: true,
      featureCount: evaluation.featureCount,
      diagnostics,
      assembly: arm.name,
      validator: {
        status: validator.status,
        diagnostics: [...validator.diagnostics],
        partCount: validator.partCount,
        jointCount: validator.jointCount,
      },
      ...(poseEnvelope !== undefined ? { poseEnvelope } : {}),
      ...(poseEnvelope !== undefined ? { connectorWorkspace: poseEnvelope.connectorWorkspace } : {}),
      ...(poseEnvelope?.gripperAperture !== undefined ? { gripperAperture: poseEnvelope.gripperAperture } : {}),
      fitness,
    };
  }

  return {
    ok: false,
    featureCount: evaluation.featureCount,
    diagnostics,
    assembly: arm.name,
    validator: {
      status: validator.status,
      diagnostics: [...validator.diagnostics],
      partCount: validator.partCount,
      jointCount: validator.jointCount,
    },
    ...(poseEnvelope !== undefined ? { poseEnvelope } : {}),
    ...(poseEnvelope !== undefined ? { connectorWorkspace: poseEnvelope.connectorWorkspace } : {}),
    ...(poseEnvelope?.gripperAperture !== undefined ? { gripperAperture: poseEnvelope.gripperAperture } : {}),
    fitness,
    suggestedRepairPrompt: buildSuggestedRepairPrompt(diagnostics, fitness, input),
  };
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

function buildSuggestedRepairPrompt(
  diagnostics: readonly (CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic | MechanicalPlausibilityDiagnostic | MechanicalIntentDiagnostic | MechanicalTransmissionDiagnostic)[],
  fitness?: MechanismFitnessResult,
  input?: Pick<ReviewCadInput, 'designGoal' | 'preserveInterfaces'>,
): string {
  const blockingReasons = fitness?.blockingReasons ?? [];
  if (diagnostics.length === 0 && blockingReasons.length === 0) {
    return 'No structured diagnostics were produced. Re-run review_cad after returning an assembly scene from the script.';
  }
  // v0.7.4 — filter out info-severity diagnostics (documented v0.7.x
  // deferrals from Gate 1's vec3-origin face-inference path). They are not
  // actionable repair facts and would otherwise crowd out higher-priority
  // fitness blocking reasons given the 8-slot cap below.
  const actionableDiagnostics = diagnostics.filter((d) =>
    'severity' in d ? d.severity !== 'info' : true,
  );
  const diagnosticFacts = actionableDiagnostics.slice(0, 8).map((d) => {
    const scoped = 'sampleName' in d && d.sampleName ? ` [${d.sampleName}]` : '';
    return `- ${d.code}${scoped}: ${d.message} Hint: ${d.hint}`;
  });
  const remaining = Math.max(0, 8 - diagnosticFacts.length);
  const fitnessFacts = blockingReasons.slice(0, remaining).map((reason) =>
    `- ${reason.code}: ${reason.message} Hint: ${reason.repairHint}`,
  );
  const facts = [...diagnosticFacts, ...fitnessFacts].join('\n');
  const repairDirective = fitness === undefined
    ? ''
    : `\nRepair mode: ${fitness.repairMode}\nDirective: ${fitness.repairDirective}\n`;
  const designContext = [
    input?.designGoal ? `Design goal: ${input.designGoal}` : undefined,
    input?.preserveInterfaces?.length ? `Preserve interfaces: ${input.preserveInterfaces.join(', ')}` : undefined,
  ].filter((line): line is string => line !== undefined);
  const designBlock = designContext.length === 0 ? '' : `\n${designContext.join('\n')}\n`;
  return `Repair the kernelCAD script using these deterministic review facts:${repairDirective}${designBlock}\n${facts}`;
}
