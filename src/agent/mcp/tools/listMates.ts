// src/mcp/tools/listMates.ts
//
// v0.6 MCP tool — read the declared mate records on the active assembly.
// Wraps the internal `arm.__mates()` accessor (capture/assembly.ts T6).

import type { Assembly } from '../../../modeling/capture/assembly';
import type { MateLimitRange, MatePose } from '../../../modeling/mates/mate';
import type { MateType } from '../../../modeling/mates/mateTypes';
import { getActiveMcpSession } from '../activeSession';

export interface ListMatesInput {
  assembly?: string;
}

export interface MateSummary {
  name: string;
  a: string;
  b: string;
  type: MateType;
  pose?: MatePose;
  limitsDeg?: MateLimitRange;
  limitsMm?: MateLimitRange;
}

export type ListMatesOutput =
  | { ok: true; mates: MateSummary[] }
  | { ok: false; error: string; errorCode?: string; errorHint?: string };

export async function listMatesTool(input: ListMatesInput): Promise<ListMatesOutput> {
  const active = getActiveMcpSession();
  if (!active) {
    return {
      ok: false,
      error: 'No active kernelCAD session. Run evaluate_script successfully before calling list_mates.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.session.no-active-session',
    };
  }
  const assemblies = active.session.assemblies;
  if (assemblies.size === 0) return { ok: true, mates: [] };
  const arm = (input.assembly !== undefined
    ? assemblies.get(input.assembly)
    : assemblies.values().next().value) as Assembly | undefined;
  if (!arm) {
    return {
      ok: false,
      error: `list_mates: assembly '${input.assembly ?? '<default>'}' not found.`,
      errorCode: 'feature.invalid-args',
    };
  }
  return {
    ok: true,
    mates: arm.__mates().map((m) => ({
      name: m.name,
      a: m.a,
      b: m.b,
      type: m.type,
      ...(m.pose !== undefined ? { pose: m.pose } : {}),
      ...(m.limitsDeg !== undefined ? { limitsDeg: m.limitsDeg } : {}),
      ...(m.limitsMm !== undefined ? { limitsMm: m.limitsMm } : {}),
    })),
  };
}
