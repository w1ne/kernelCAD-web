// src/mcp/tools/addConnector.ts
//
// v0.6 MCP tool — register a mate-style connector on a named part of the
// active assembly. Wraps the capture-side `partRef.connector(name, opts)`
// chain method (assembly.ts T4). Operates on the active MCP session set up
// by `evaluate_script`; agents drive the assembly incrementally by calling
// this tool after authoring a script that constructs the parts.

import type { Assembly } from '../../../modeling/capture/assembly';
import { isKernelError } from '../../../shared/intent/kernelError';
import type { ConnectorOrigin, ConnectorType } from '../../../modeling/mates/connector';
import type { Vec3 } from '../../../shared/intent/types';
import { getActiveMcpSession } from '../activeSession';
import { defineMCPTool } from '../defineMCPTool';

export interface AddConnectorInput {
  assembly?: string;
  part: string;
  name: string;
  type: ConnectorType;
  origin: Vec3 | ConnectorOrigin;
  axis?: Vec3;
  normal?: Vec3;
}

export type AddConnectorOutput =
  | { ok: true; connector: { partName: string; name: string; type: ConnectorType } }
  | { ok: false; error: string; errorCode?: string; errorHint?: string };

export async function addConnectorTool(input: AddConnectorInput): Promise<AddConnectorOutput> {
  const active = getActiveMcpSession();
  if (!active) {
    return {
      ok: false,
      error: 'No active kernelCAD session. Run evaluate_script successfully before calling add_connector.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.session.no-active-session',
    };
  }
  const arm = resolveAssembly(active.session.assemblies, input.assembly);
  if (!arm.ok) return arm;
  const parts = arm.value.__parts();
  const part = parts.find((p) => p.name === input.part);
  if (!part) {
    const known = parts.map((p) => p.name).join(', ') || '(none)';
    return {
      ok: false,
      error: `add_connector: part '${input.part}' not found on assembly '${arm.value.name}'. Known parts: ${known}.`,
      errorCode: 'feature.invalid-args',
      errorHint: `invalid-args.assembly.unknown-part — declare the part via arm.part('${input.part}', ...) before adding a connector.`,
    };
  }
  try {
    part.connector(input.name, {
      type: input.type,
      origin: normalizeOrigin(input.origin),
      ...(input.axis !== undefined ? { axis: input.axis } : {}),
      ...(input.normal !== undefined ? { normal: input.normal } : {}),
    });
    return { ok: true, connector: { partName: part.name, name: input.name, type: input.type } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: isKernelError(e) ? e.code : undefined,
      errorHint: isKernelError(e) ? e.hint : undefined,
    };
  }
}

function normalizeOrigin(o: Vec3 | ConnectorOrigin): ConnectorOrigin {
  return Array.isArray(o) ? { kind: 'vec3', value: o } : o;
}

function resolveAssembly(
  assemblies: ReadonlyMap<string, unknown>,
  name: string | undefined,
): { ok: true; value: Assembly } | { ok: false; error: string; errorCode?: string; errorHint?: string } {
  if (assemblies.size === 0) {
    return {
      ok: false,
      error: 'No assembly captured on the active session.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.assembly.no-assembly — run evaluate_script with a script that calls kcad.assembly(...).',
    };
  }
  if (name !== undefined) {
    const arm = assemblies.get(name) as Assembly | undefined;
    if (!arm) return { ok: false, error: `add_connector: assembly '${name}' not found.`, errorCode: 'feature.invalid-args' };
    return { ok: true, value: arm };
  }
  return { ok: true, value: assemblies.values().next().value as Assembly };
}

export const addConnectorMcpTool = defineMCPTool<AddConnectorInput>({
  name: 'add_connector',
  description:
    'Register a v0.6 mate-style connector on a named part of the active assembly. Requires a prior evaluate_script that called kcad.assembly(...). Origin accepts a [x, y, z] tuple shorthand or a structured ConnectorOrigin ({ kind: "vec3" | "topology", ... }). Returns the registered connector\'s { partName, name, type }.',
  inputSchema: {
    type: 'object',
    properties: {
      assembly: { type: 'string', description: 'Assembly name; defaults to the only/first assembly on the active session.' },
      part: { type: 'string', description: 'Part name declared via arm.part(name, ...).' },
      name: { type: 'string', description: 'Connector name (unique within the part).' },
      type: { type: 'string', enum: ['frame', 'axis', 'planar', 'ball'] },
      origin: { description: 'Origin as [x, y, z] (vec3 shorthand) or a structured ConnectorOrigin.' },
      axis: { type: 'array', description: 'Optional [x, y, z] axis (axis connectors).' },
      normal: { type: 'array', description: 'Optional [x, y, z] normal (frame / planar connectors).' },
    },
    required: ['part', 'name', 'type', 'origin'],
  },
  handler: addConnectorTool,
  metadata: { mutatesSession: true, category: 'assembly' },
});
