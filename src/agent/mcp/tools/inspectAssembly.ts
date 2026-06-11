// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly, AssemblyPartStored, TransmissionIntentRecord } from '../../../modeling/capture/assembly';
import type { Vec3 } from '../../../shared/intent/types';
import {
  reviewMechanicalPlausibility,
  type MechanicalPlausibilityDiagnostic,
  type PartDisconnectedDiagnostic,
} from '../../../modeling/mates/mechanicalPlausibility';
import {
  reviewMechanicalTransmission,
  type MechanicalTransmissionDiagnostic,
} from '../../../modeling/mates/mechanicalTransmission';
import { formatTopoRef, type TopoKind, type TopoModifier } from '../../../kernel/naming';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { resolveTopologyOriginOnBackend } from '../../../modeling/backends/occt/connectorTopology';

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
  /** For `topology` origins: the canonical `@kc[<part>/<kind>/<name>]` string.
   *  For `vec3` origins: the [x, y, z] tuple unchanged. */
  origin?: string | unknown;
  /** Raw structured form when `origin` is a string. Kept for one release per
   *  spec §3.6 so consumers can migrate to the @kc[...] string. */
  originRaw?: unknown;
  /** Numeric vec3 resolution of topology-bound origins, when resolution
   *  succeeds against the lowered shape. Absent when resolution fails (e.g.
   *  vertex queries — deferred to v0.7). */
  resolved?: [number, number, number];
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
  const lowered = await part.originalShape.lower();
  const bbox = lowered.boundingBox();
  const connectors = part.mateConnectors.map((c) => summarizeConnector(part.name, c, lowered));
  return {
    name: part.name,
    bbox,
    connectorCount: part.mateConnectors.length,
    connectors,
    ...(disconnected === undefined ? {} : {
      disconnected: {
        componentCount: disconnected.componentCount,
        largestComponentTriangleCount: disconnected.largestComponentTriangleCount,
        maxComponentGapMm: disconnected.maxComponentGapMm,
      },
    }),
  };
}

const QUERY_KIND_TO_TOPO_KIND: Record<string, TopoKind> = {
  'face-center': 'face',
  'face-normal': 'face',
  'edge-axis': 'edge',
  'vertex': 'vertex',
};

const QUERY_KIND_TO_MODIFIER: Record<string, TopoModifier | undefined> = {
  'face-normal': 'normal',
  'edge-axis': 'axis',
};

function summarizeConnector(
  partName: string,
  connector: AssemblyMateConnector,
  lowered: OcctBackend,
): InspectAssemblyConnectorSummary {
  if (connector.origin.kind === 'vec3') {
    return {
      name: connector.name,
      type: connector.type,
      originKind: connector.origin.kind,
      origin: connector.origin.value,
      ...(connector.axis !== undefined ? { axis: connector.axis } : {}),
      ...(connector.normal !== undefined ? { normal: connector.normal } : {}),
    };
  }
  // topology — emit @kc[...] string + (when resolvable) numeric vec3.
  const q = connector.origin.query;
  const topoKind = QUERY_KIND_TO_TOPO_KIND[q.kind] ?? 'face';
  const modifier = QUERY_KIND_TO_MODIFIER[q.kind];
  const ref = formatTopoRef({
    owner: partName,
    kind: topoKind,
    segments: [q.name],
    ...(modifier !== undefined ? { modifier } : {}),
  });
  // Resolve to a numeric vec3 when the backend allows it. Resolution failures
  // (e.g. vertex queries, which are deferred to v0.7) surface through the
  // existing review-facts channel rather than crashing inspect output.
  let resolved: [number, number, number] | undefined;
  try {
    const v = resolveTopologyOriginOnBackend(lowered, q, {});
    resolved = v as [number, number, number];
  } catch {
    // swallow — disconnected / review facts capture the underlying error.
  }
  return {
    name: connector.name,
    type: connector.type,
    originKind: connector.origin.kind,
    origin: ref,
    originRaw: connector.origin,
    ...(resolved !== undefined ? { resolved } : {}),
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
