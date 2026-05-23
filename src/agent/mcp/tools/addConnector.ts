// src/mcp/tools/addConnector.ts
//
// v0.6 MCP tool — register a mate-style connector on a named part of the
// active assembly. Wraps the capture-side `partRef.connector(name, opts)`
// chain method (assembly.ts T4). Operates on the active MCP session set up
// by `evaluate_script`; agents drive the assembly incrementally by calling
// this tool after authoring a script that constructs the parts.

import type { Assembly } from '../../../modeling/capture/assembly';
import { isKernelError, KernelError } from '../../../shared/intent/kernelError';
import type { ConnectorOrigin, ConnectorType } from '../../../modeling/mates/connector';
import type { Vec3 } from '../../../shared/intent/types';
import { parseTopoRef } from '../../../kernel/naming';
import { getActiveMcpSession } from '../activeSession';

export interface AddConnectorInput {
  assembly?: string;
  part: string;
  name: string;
  type: ConnectorType;
  origin: Vec3 | ConnectorOrigin | string;
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

function normalizeOrigin(o: Vec3 | ConnectorOrigin | string): ConnectorOrigin {
  if (Array.isArray(o)) return { kind: 'vec3', value: o };
  if (typeof o === 'string') {
    if (!o.startsWith('@kc[')) {
      throw new KernelError(
        'feature.invalid-args',
        `add_connector: string origin '${o}' must be a @kc[...] topology ref.`,
        undefined,
        `Pass either a [x,y,z] tuple, a structured ConnectorOrigin, or a @kc[<part>/face/<name>] / @kc[<part>/edge/<name>] / @kc[<part>/vertex/<name>] ref.`,
      );
    }
    const parsed = parseTopoRef(o);
    if ('error' in parsed) {
      throw new KernelError(
        'feature.invalid-args',
        `add_connector: malformed origin ref '${o}': ${parsed.error}.`,
        undefined,
        `Topology refs use the @kc[owner/kind/name] grammar. ${parsed.error}.`,
      );
    }
    const name = parsed.segments[parsed.segments.length - 1];
    if (name === undefined) {
      throw new KernelError(
        'feature.invalid-args',
        `add_connector: origin ref '${o}' has no entity name segment.`,
        undefined,
        `Append a name segment: '@kc[${parsed.owner}/${parsed.kind}/<name>]'.`,
      );
    }
    if (parsed.kind === 'face') {
      // Default for face refs is face-center per spec §3.4 modifier rules.
      const isNormal = parsed.modifier === 'normal';
      return {
        kind: 'topology',
        query: isNormal
          ? { kind: 'face-normal', name }
          : { kind: 'face-center', name },
      };
    }
    if (parsed.kind === 'edge') {
      return { kind: 'topology', query: { kind: 'edge-axis', name } };
    }
    if (parsed.kind === 'vertex') {
      return { kind: 'topology', query: { kind: 'vertex', name } };
    }
    throw new KernelError(
      'feature.invalid-args',
      `add_connector: ref '${o}' has kind '${parsed.kind}'; expected face/edge/vertex.`,
      undefined,
      `Use a topology ref of kind face, edge, or vertex.`,
    );
  }
  return o;
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
