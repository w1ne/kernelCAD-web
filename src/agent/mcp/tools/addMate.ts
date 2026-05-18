// src/mcp/tools/addMate.ts
//
// v0.6 MCP tool — declare a typed mate between two named connectors on the
// active assembly. Wraps `arm.mate(name, aRef, bRef, type)` from
// capture/assembly.ts (T5). Capture-time errors (type-mismatch, connector-
// not-found) bubble out as structured MCP error envelopes.

import type { Assembly } from '../../../modeling/capture/assembly';
import { isKernelError } from '../../../shared/intent/kernelError';
import type { MateLimitRange, MatePose } from '../../../modeling/mates/mate';
import type { MateType } from '../../../modeling/mates/mateTypes';
import { getActiveMcpSession } from '../activeSession';
import { defineMCPTool } from '../defineMCPTool';

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

export const addMateMcpTool = defineMCPTool<AddMateInput>({
  name: 'add_mate',
  description:
    'Declare a typed mate between two named connectors on the active assembly. Connector refs are "<partName>.<connectorName>". Mate types: fastened, revolute, prismatic, cylindrical, planar, ball, pin_slot. Optional pose and limitsDeg/limitsMm expose articulated intent for solver/review tools.',
  inputSchema: {
    type: 'object',
    properties: {
      assembly: { type: 'string' },
      name: { type: 'string', description: 'Mate name (unique within the assembly).' },
      a: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
      b: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
      type: { type: 'string', enum: ['fastened', 'revolute', 'prismatic', 'cylindrical', 'planar', 'ball', 'pin_slot'] },
      pose: { description: 'Optional mate pose: number for scalar mates or [x, y, z] degrees for ball mates.' },
      limitsDeg: { type: 'array', description: 'Optional [minDeg, maxDeg] range for revolute/cylindrical/pin_slot mates.' },
      limitsMm: { type: 'array', description: 'Optional [minMm, maxMm] range for prismatic mates.' },
    },
    required: ['name', 'a', 'b', 'type'],
  },
  handler: addMateTool,
  metadata: { mutatesSession: true, category: 'assembly' },
});
