import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeatureId, FeatureRef } from '../../../shared/intent/types';
import { runMcpScript } from '../runMcpScript';
import { defineMCPTool } from '../defineMCPTool';

export interface ListAssembliesInput {
  file?: string;
  code?: string;
}

export interface AssemblyPartSummary {
  id: FeatureId;
  name: string;
  shapeId?: FeatureId;
  at?: unknown;
  connectors: Record<string, unknown>;
  placedBy?: unknown;
}

export interface AssemblyJointSummary {
  id: FeatureId;
  name: string;
  kind: string;
  partIds: { a?: FeatureId; b?: FeatureId };
  axis?: unknown;
  origin?: unknown;
  limitsDeg?: unknown;
}

export interface AssemblyConnectionSummary {
  id: FeatureId;
  name: string;
  kind: string;
  partIds: { a?: FeatureId; b?: FeatureId };
  a?: unknown;
  b?: unknown;
}

export interface AssemblyModelSummary {
  id: FeatureId;
  partIds: FeatureId[];
}

export interface AssemblySummary {
  name: string;
  parts: AssemblyPartSummary[];
  joints: AssemblyJointSummary[];
  connections: AssemblyConnectionSummary[];
  models: AssemblyModelSummary[];
}

export interface ListAssembliesOutput {
  ok?: boolean;
  assemblies: AssemblySummary[];
  error?: string;
  errorCode?: string;
}

export async function listAssembliesTool(
  input: ListAssembliesInput,
): Promise<ListAssembliesOutput> {
  const result = await runMcpScript(input);
  if (!result.ok) return { ok: false, assemblies: [], error: result.error, errorCode: result.errorCode };

  return { assemblies: summarizeAssemblies(result.run.records) };
}

function summarizeAssemblies(records: readonly FeatureRecord[]): AssemblySummary[] {
  const assemblies = new Map<string, AssemblySummary>();

  for (const record of records) {
    if (!isAssemblyRecord(record)) continue;
    const metadata = record.metadata ?? {};
    const assemblyName = typeof metadata.assemblyName === 'string'
      ? metadata.assemblyName
      : 'assembly';
    const assembly = getOrCreateAssembly(assemblies, assemblyName);

    if (record.kind === 'assemblyPart') {
      assembly.parts.push({
        id: record.id,
        name: stringMetadata(metadata.partName, record.id),
        shapeId: featureInputId(record.inputs.shape),
        at: metadata.at,
        connectors: objectMetadata(metadata.connectors),
        ...(metadata.placedBy !== undefined ? { placedBy: metadata.placedBy } : {}),
      });
    }

    if (record.kind === 'assemblyJoint') {
      assembly.joints.push({
        id: record.id,
        name: stringMetadata(metadata.jointName, record.id),
        kind: stringMetadata(metadata.jointKind, 'joint'),
        partIds: {
          a: featureInputId(record.inputs.a),
          b: featureInputId(record.inputs.b),
        },
        ...(metadata.axis !== undefined ? { axis: metadata.axis } : {}),
        ...(metadata.origin !== undefined ? { origin: metadata.origin } : {}),
        ...(metadata.limitsDeg !== undefined ? { limitsDeg: metadata.limitsDeg } : {}),
      });
    }

    if (record.kind === 'assemblyConnect') {
      assembly.connections.push({
        id: record.id,
        name: stringMetadata(metadata.connectName, record.id),
        kind: stringMetadata(metadata.kind, 'fixed'),
        partIds: {
          a: featureInputId(record.inputs.a),
          b: featureInputId(record.inputs.b),
        },
        ...(metadata.a !== undefined ? { a: metadata.a } : {}),
        ...(metadata.b !== undefined ? { b: metadata.b } : {}),
      });
    }

    if (record.kind === 'assemblyModel') {
      assembly.models.push({
        id: record.id,
        partIds: Array.isArray(metadata.partIds)
          ? metadata.partIds.filter((partId): partId is FeatureId => typeof partId === 'string')
          : Object.entries(record.inputs)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, ref]) => featureInputId(ref))
            .filter((partId): partId is FeatureId => partId !== undefined),
      });
    }
  }

  return [...assemblies.values()];
}

function getOrCreateAssembly(
  assemblies: Map<string, AssemblySummary>,
  name: string,
): AssemblySummary {
  const existing = assemblies.get(name);
  if (existing) return existing;
  const assembly: AssemblySummary = {
    name,
    parts: [],
    joints: [],
    connections: [],
    models: [],
  };
  assemblies.set(name, assembly);
  return assembly;
}

function isAssemblyRecord(record: FeatureRecord): boolean {
  return (
    record.kind === 'assemblyPart' ||
    record.kind === 'assemblyJoint' ||
    record.kind === 'assemblyConnect' ||
    record.kind === 'assemblyModel'
  );
}

function featureInputId(ref: FeatureRef | undefined): FeatureId | undefined {
  return ref?.kind === 'feature' ? ref.id : undefined;
}

function stringMetadata(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function objectMetadata(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const listAssembliesMcpTool = defineMCPTool<ListAssembliesInput>({
  name: 'list_assemblies',
  description:
    'List assembly intent captured by a kernelCAD script: assemblies, parts, named connectors, ' +
    'fixed connections, joints, and aggregate assembly models. Pass either { file } or { code }.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
      code: { type: 'string', description: 'Inline kernelCAD script source.' },
    },
  },
  handler: listAssembliesTool,
});
