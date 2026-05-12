import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../capture/assembly';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { withNextActions } from '../../diagnostics/diagnostic';
import type { PoseEnvelopeDiagnostic, PoseEnvelopeReviewResult } from '../../lib/mates/poseEnvelope';
import { reviewPoseEnvelope } from '../../lib/mates/poseEnvelope';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../lib/mates/validator';
import { validateAssemblyWithMates } from '../../lib/mates/validator';
import { clearActiveMcpSession, setActiveMcpSession } from '../activeSession';

export interface ReviewCadInput {
  file?: string;
  code?: string;
  assembly?: string;
  includePoseEnvelope?: boolean;
  includeInterference?: boolean;
  epsilonMm3?: number;
  trackConnectors?: string[];
}

export type ReviewCadOutput =
  | {
      ok: true;
      featureCount: number;
      diagnostics: Array<CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic>;
      assembly: string;
      validator: {
        status: ValidatorStatus;
        diagnostics: ValidatorDiagnostic[];
        partCount: number;
        jointCount: number;
      };
      poseEnvelope?: PoseEnvelopeReviewResult;
      connectorWorkspace?: PoseEnvelopeReviewResult['connectorWorkspace'];
    }
  | {
      ok: false;
      featureCount: number;
      diagnostics: Array<CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic>;
      assembly?: string;
      validator?: {
        status: ValidatorStatus;
        diagnostics: ValidatorDiagnostic[];
        partCount: number;
        jointCount: number;
      };
      poseEnvelope?: PoseEnvelopeReviewResult;
      connectorWorkspace?: PoseEnvelopeReviewResult['connectorWorkspace'];
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
      suggestedRepairPrompt: buildSuggestedRepairPrompt(withNextActions(evaluation.diagnostics)),
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
  const includePoseEnvelope = input.includePoseEnvelope ?? true;
  const poseEnvelope = includePoseEnvelope
    ? await reviewPoseEnvelope(arm, {
        includeInterference: input.includeInterference ?? true,
        epsilonMm3: input.epsilonMm3,
        trackConnectors: input.trackConnectors,
      })
    : undefined;

  const diagnostics = [
    ...withNextActions(evaluation.diagnostics),
    ...validator.diagnostics,
    ...(poseEnvelope?.diagnostics ?? []),
  ];
  const ok = !diagnostics.some((d) => d.severity === 'error') &&
    validator.status !== 'over-constrained' &&
    validator.status !== 'did-not-converge';

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
    suggestedRepairPrompt: buildSuggestedRepairPrompt(diagnostics),
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
  diagnostics: readonly (CompilerDiagnostic | ValidatorDiagnostic | PoseEnvelopeDiagnostic)[],
): string {
  if (diagnostics.length === 0) {
    return 'No structured diagnostics were produced. Re-run review_cad after returning an assembly scene from the script.';
  }
  const facts = diagnostics.slice(0, 8).map((d) => {
    const scoped = 'sampleName' in d && d.sampleName ? ` [${d.sampleName}]` : '';
    return `- ${d.code}${scoped}: ${d.message} Hint: ${d.hint}`;
  }).join('\n');
  return `Repair the kernelCAD script using these deterministic review facts:\n${facts}`;
}
