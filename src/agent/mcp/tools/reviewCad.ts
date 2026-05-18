import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import {
  summarizeMechanismFitness,
  type MechanismFitnessResult,
} from '../../../modeling/mates/mechanismFitness';
import type { GripperApertureRequest } from '../../../modeling/mates/gripperAperture';
import type { PoseEnvelopeDiagnostic, PoseEnvelopeReviewResult } from '../../../modeling/mates/poseEnvelope';
import { reviewPoseEnvelope } from '../../../modeling/mates/poseEnvelope';
import { suggestLimitFix } from '../../../modeling/mates/limitFixSuggest';
import {
  reviewMechanicalPlausibility,
  type MechanicalPlausibilityDiagnostic,
} from '../../../modeling/mates/mechanicalPlausibility';
import {
  reviewMechanicalIntent,
  type MechanicalIntentDiagnostic,
} from '../../../modeling/mates/mechanicalIntent';
import {
  reviewMechanicalTransmission,
  type MechanicalTransmissionDiagnostic,
} from '../../../modeling/mates/mechanicalTransmission';
import type { ValidatorDiagnostic, ValidatorStatus } from '../../../modeling/mates/validator';
import { validateAssemblyWithMates } from '../../../modeling/mates/validator';
import { clearActiveMcpSession, setActiveMcpSession } from '../activeSession';
import { defineMCPTool } from '../defineMCPTool';

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
  samplesPerMate?: number;
  combinatorial?: boolean;
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
      repairContext: RepairContext;
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
      repairContext: RepairContext;
      suggestedRepairPrompt: string;
    };

type ReviewDiagnostic =
  | CompilerDiagnostic
  | ValidatorDiagnostic
  | PoseEnvelopeDiagnostic
  | MechanicalPlausibilityDiagnostic
  | MechanicalIntentDiagnostic
  | MechanicalTransmissionDiagnostic;

export async function reviewCadTool(input: ReviewCadInput): Promise<ReviewCadOutput> {
  const { evaluation, model } = await evaluateForReview(input as EvaluateInput);
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
      repairContext: await buildRepairContext(undefined, [], undefined, input),
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
        samplesPerMate: input.samplesPerMate,
        combinatorial: input.combinatorial,
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

  const repairContext = await buildRepairContext(arm, diagnostics, fitness, input);

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
      repairContext,
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
    repairContext,
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

export const reviewCadMcpTool = defineMCPTool<ReviewCadInput>({
  name: 'review_cad',
  description: 'Run the deterministic CAD review loop: evaluate the script, validate the assembly/mate graph, check mate connectors touch modeled material, sample declared mate limits, optionally check interferences at sampled poses, report connector workspace bounds, and return a mechanism fitness verdict for agent self-review. Fitness includes repairMode: none, local-fix, parameter-tune, or topology-redesign.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
      code: { type: 'string', description: 'Inline kernelCAD script source.' },
      assembly: { type: 'string', description: 'Assembly name; defaults to the first captured assembly.' },
      designGoal: { type: 'string', description: 'Original user design prompt or goal. Included in suggestedRepairPrompt so topology-redesign repairs restart from the intended physical design instead of local coordinate nudges.' },
      preserveInterfaces: {
        type: 'array',
        description: 'External mates, connector refs, part names, or behavioral interfaces the repair agent must preserve during redesign.',
        items: { type: 'string' },
      },
      includePoseEnvelope: { type: 'boolean', description: 'Whether to sample declared mate limits. Default true.' },
      includeInterference: { type: 'boolean', description: 'Whether sampled poses run BREP interference checks. Default true.' },
      samplesPerMate: {
        type: 'integer',
        minimum: 1,
        description: 'Pose-envelope samples per declared-limit mate. 1 (default) = corners only; >=3 adds uniform interior points between min and max. Total samples per non-locked mate = samplesPerMate.',
      },
      combinatorial: {
        type: 'boolean',
        description: 'Sample all 2^N limit-corner combinations across mates with declared limits. Capped at 8 mates with limits; combine with samplesPerMate for both interior coverage and worst-pose detection. Default false.',
      },
      epsilonMm3: { type: 'number', description: 'Interference volume threshold in mm^3. Default 0.01.' },
      trackConnectors: {
        type: 'array',
        description: 'Optional connector refs such as ["gripper-plate.tool-tip"] to limit connector workspace reporting.',
        items: { type: 'string' },
      },
    },
  },
  handler: reviewCadTool,
});
