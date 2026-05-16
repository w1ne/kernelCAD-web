// src/mcp/tools/addMate.ts
//
// v0.6 MCP tool — declare a typed mate between two named connectors on the
// active assembly. Wraps `arm.mate(name, aRef, bRef, type)` from
// capture/assembly.ts (T5). Capture-time errors (type-mismatch, connector-
// not-found) bubble out as structured MCP error envelopes.

import type { Assembly } from '../../shared/capture/assembly';
import { isKernelError } from '../../intent/kernelError';
import type { MateLimitRange, MatePose } from '../../lib/mates/mate';
import type { MateType } from '../../lib/mates/mateTypes';
import { getActiveMcpSession } from '../activeSession';

export interface AddMateInput {
  assembly?: string;
  name: string;
  a: string;
  b: string;
  type: MateType;
  pose?: MatePose;
  limitsDeg?: MateLimitRange;
  limitsMm?: MateLimitRange;
}

export type AddMateOutput =
  | { ok: true; mate: { name: string; a: string; b: string; type: MateType; pose?: MatePose; limitsDeg?: MateLimitRange; limitsMm?: MateLimitRange } }
  | { ok: false; error: string; errorCode?: string; errorHint?: string };

export async function addMateTool(input: AddMateInput): Promise<AddMateOutput> {
  const active = getActiveMcpSession();
  if (!active) {
    return {
      ok: false,
      error: 'No active kernelCAD session. Run evaluate_script successfully before calling add_mate.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.session.no-active-session',
    };
  }
  const assemblies = active.session.assemblies;
  if (assemblies.size === 0) {
    return {
      ok: false,
      error: 'No assembly captured on the active session.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.assembly.no-assembly — run evaluate_script with a script that calls kcad.assembly(...).',
    };
  }
  const arm = (input.assembly !== undefined
    ? assemblies.get(input.assembly)
    : assemblies.values().next().value) as Assembly | undefined;
  if (!arm) {
    return {
      ok: false,
      error: `add_mate: assembly '${input.assembly ?? '<default>'}' not found.`,
      errorCode: 'feature.invalid-args',
    };
  }
  try {
    const opts = {
      ...(input.pose !== undefined ? { pose: input.pose } : {}),
      ...(input.limitsDeg !== undefined ? { limitsDeg: input.limitsDeg } : {}),
      ...(input.limitsMm !== undefined ? { limitsMm: input.limitsMm } : {}),
    };
    arm.mate(input.name, input.a, input.b, input.type, opts);
    return {
      ok: true,
      mate: {
        name: input.name,
        a: input.a,
        b: input.b,
        type: input.type,
        ...(input.pose !== undefined ? { pose: input.pose } : {}),
        ...(input.limitsDeg !== undefined ? { limitsDeg: input.limitsDeg } : {}),
        ...(input.limitsMm !== undefined ? { limitsMm: input.limitsMm } : {}),
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: isKernelError(e) ? e.code : undefined,
      errorHint: isKernelError(e) ? e.hint : undefined,
    };
  }
}
