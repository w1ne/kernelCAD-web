import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly, AssemblyPartStored, TransmissionIntentRecord } from '../../shared/capture/assembly';
import type { Vec3 } from '../../intent/types';
import {
  reviewMechanicalPlausibility,
  type MechanicalPlausibilityDiagnostic,
  type PartDisconnectedDiagnostic,
} from '../../lib/mates/mechanicalPlausibility';
import {
  reviewMechanicalTransmission,
  type MechanicalTransmissionDiagnostic,
} from '../../lib/mates/mechanicalTransmission';

type Bbox = { min: Vec3; max: Vec3 };
type AssemblyMateConnector = AssemblyPartStored['mateConnectors'][number];

export interface InspectAssemblyInput {
  file?: string;
  code?: string;
  assembly?: string;
}

export interface InspectAssemblyPartSummary {
  name: string;
  bbox: Bbox;
  connectorCount: number;
  connectors: InspectAssemblyConnectorSummary[];
  disconnected?: {
    componentCount: number;
    largestComponentTriangleCount: number;
    maxComponentGapMm: number;
  };
}

export interface InspectAssemblyConnectorSummary {
  name: string;
  type: string;
  originKind: string;
  origin?: unknown;
  axis?: Vec3;
  normal?: Vec3;
}

export interface InspectAssemblyMateSummary {
  name: string;
  type: string;
  a: string;
  b: string;
}

export interface InspectAssemblyTransmissionSummary {
  name: string;
  kind: string;
  sourceMate: string;
  drivenMates: readonly string[];
  actuator?: string;
  input?: string;
  output?: string;
  path: readonly string[];
  ratio?: number;
  notes?: string;
}

export interface InspectAssemblyReviewFact {
  code: string;
  severity: string;
  message: string;
  hint: string;
  partName?: string;
  mateName?: string;
}

export type InspectAssemblyOutput =
  | {
      ok: true;
      featureCount: number;
      assembly: string;
      partCount: number;
      mateCount: number;
      parts: InspectAssemblyPartSummary[];
      mates: InspectAssemblyMateSummary[];
      transmissions: InspectAssemblyTransmissionSummary[];
      reviewFacts: InspectAssemblyReviewFact[];
      unexplainedGeometry: InspectAssemblyReviewFact[];
      nextActionPrompt: string;
    }
  | {
      ok: false;
      featureCount: number;
      error: string;
      suggestedRepairPrompt: string;
    };

export async function inspectAssemblyTool(
  input: InspectAssemblyInput,
): Promise<InspectAssemblyOutput> {
  const { evaluation, model } = await evaluateAndBuildScript(input as EvaluateInput);
  if (evaluation.exitCode !== 0 || !model) {
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.',
      suggestedRepairPrompt: 'Fix script diagnostics, then rerun inspect_assembly so the agent can inventory physical parts before design_loop.',
    };
  }

  const arm = selectAssembly(model.session.assemblies as Map<string, Assembly>, input.assembly);
  if (arm === undefined) {
    return {
      ok: false,
      featureCount: evaluation.featureCount,
      error: input.assembly
        ? `inspect_assembly: assembly '${input.assembly}' not found.`
        : 'inspect_assembly: no assembly captured by the script.',
      suggestedRepairPrompt: 'Return arm.model() or arm.solvedModel(...) from a script that calls assembly(...), then rerun inspect_assembly.',
    };
  }

  const mechanical = await reviewMechanicalPlausibility(arm);
  const mechanicalTransmission = await reviewMechanicalTransmission(arm);
  const disconnectedByPart = new Map(
    mechanical.diagnostics
      .filter(isPartDisconnected)
      .map((diagnostic) => [diagnostic.partName, diagnostic]),
  );
  const parts = await Promise.all(
    arm.__parts().map((part) => summarizePart(part, disconnectedByPart.get(part.name))),
  );
  const reviewFacts = [
    ...mechanical.diagnostics.map(toReviewFact),
    ...mechanicalTransmission.diagnostics.map(toReviewFact),
  ];
  const unexplainedGeometry = reviewFacts.filter((fact) =>
    fact.code === 'assembly.mechanical.part-disconnected',
  );

  return {
    ok: true,
    featureCount: evaluation.featureCount,
    assembly: arm.name,
    partCount: parts.length,
    mateCount: arm.__mates().length,
    parts,
    mates: arm.__mates().map((mate) => ({
      name: mate.name,
      type: mate.type,
      a: mate.a,
      b: mate.b,
    })),
    transmissions: arm.__transmissionIntents().map(summarizeTransmission),
    reviewFacts,
    unexplainedGeometry,
    nextActionPrompt: buildNextActionPrompt(unexplainedGeometry),
  };
}

async function summarizePart(
  part: AssemblyPartStored,
  disconnected?: PartDisconnectedDiagnostic,
): Promise<InspectAssemblyPartSummary> {
  const bbox = (await part.originalShape.lower()).boundingBox();
  return {
    name: part.name,
    bbox,
    connectorCount: part.mateConnectors.length,
    connectors: part.mateConnectors.map(summarizeConnector),
    ...(disconnected === undefined ? {} : {
      disconnected: {
        componentCount: disconnected.componentCount,
        largestComponentTriangleCount: disconnected.largestComponentTriangleCount,
        maxComponentGapMm: disconnected.maxComponentGapMm,
      },
    }),
  };
}

function summarizeConnector(connector: AssemblyMateConnector): InspectAssemblyConnectorSummary {
  return {
    name: connector.name,
    type: connector.type,
    originKind: connector.origin.kind,
    ...(connector.origin.kind === 'vec3' ? { origin: connector.origin.value } : { origin: connector.origin }),
    ...(connector.axis !== undefined ? { axis: connector.axis } : {}),
    ...(connector.normal !== undefined ? { normal: connector.normal } : {}),
  };
}

function summarizeTransmission(intent: TransmissionIntentRecord): InspectAssemblyTransmissionSummary {
  return {
    name: intent.name,
    kind: intent.kind,
    sourceMate: intent.sourceMate,
    drivenMates: [...intent.drivenMates],
    ...(intent.actuator !== undefined ? { actuator: intent.actuator } : {}),
    ...(intent.input !== undefined ? { input: intent.input } : {}),
    ...(intent.output !== undefined ? { output: intent.output } : {}),
    path: [...intent.path],
    ...(intent.ratio !== undefined ? { ratio: intent.ratio } : {}),
    ...(intent.notes !== undefined ? { notes: intent.notes } : {}),
  };
}

function toReviewFact(
  diagnostic: MechanicalPlausibilityDiagnostic | MechanicalTransmissionDiagnostic,
): InspectAssemblyReviewFact {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    hint: diagnostic.hint,
    ...('partName' in diagnostic ? { partName: diagnostic.partName } : {}),
    ...('mateName' in diagnostic ? { mateName: diagnostic.mateName } : {}),
  };
}

function isPartDisconnected(
  diagnostic: MechanicalPlausibilityDiagnostic,
): diagnostic is PartDisconnectedDiagnostic {
  return diagnostic.code === 'assembly.mechanical.part-disconnected';
}

function selectAssembly(
  assemblies: Map<string, Assembly>,
  name?: string,
): Assembly | undefined {
  return name !== undefined
    ? assemblies.get(name)
    : assemblies.values().next().value;
}

function buildNextActionPrompt(unexplainedGeometry: readonly InspectAssemblyReviewFact[]): string {
  if (unexplainedGeometry.length === 0) {
    return 'Assembly inventory has no unexplained disconnected geometry. Continue with review_cad or design_loop.';
  }

  const facts = unexplainedGeometry.slice(0, 6).map((fact) =>
    `- ${fact.code}${fact.partName ? ` on '${fact.partName}'` : ''}: ${fact.message}`,
  ).join('\n');
  return `The assembly contains geometry the agent must explain or repair before accepting the design as physical:\n${facts}\nRemove arbitrary/floating solids, bridge them into a load path, or explicitly document why the disconnected geometry is intentional.`;
}
