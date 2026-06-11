// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/addMate.ts
//
// v0.6 MCP tool — declare a typed mate between two named connectors on the
// active assembly. Wraps `arm.mate(name, aRef, bRef, type)` from
// capture/assembly.ts (T5). Capture-time errors (type-mismatch, connector-
// not-found) bubble out as structured MCP error envelopes.

import type { Assembly } from '../../../modeling/capture/assembly';
import { isKernelError, KernelError } from '../../../shared/intent/kernelError';
import type { MateLimitRange, MatePose } from '../../../modeling/mates/mate';
import type { MateType } from '../../../modeling/mates/mateTypes';
import { parseTopoRef } from '../../../kernel/naming';
import { getActiveMcpSession } from '../activeSession';

/** Accept `@kc[<partName>/connector/<connectorName>]` and return `<partName>.
 *  <connectorName>`. Bare-string dot-form pass-through preserves backward
 *  compatibility with the legacy `arm.mate(a, b, ...)` ref grammar. */
function normalizeConnectorRef(ref: string, slot: 'a' | 'b'): string {
  if (typeof ref !== 'string') {
    throw new KernelError(
      'feature.invalid-args',
      `add_mate: ${slot} must be a string connector ref; got ${typeof ref}.`,
      undefined,
      `Pass either "<partName>.<connectorName>" (legacy) or "@kc[<partName>/connector/<connectorName>]".`,
    );
  }
  if (!ref.startsWith('@kc[')) return ref;
  const parsed = parseTopoRef(ref);
  if ('error' in parsed) {
    throw new KernelError(
      'feature.invalid-args',
      `add_mate: malformed connector ref '${ref}': ${parsed.error}.`,
      undefined,
      `Topology refs use the @kc[owner/kind/name] grammar. ${parsed.error}.`,
    );
  }
  if (parsed.kind !== 'connector') {
    throw new KernelError(
      'feature.invalid-args',
      `add_mate: ref '${ref}' has kind '${parsed.kind}'; expected 'connector'.`,
      undefined,
      `Use '@kc[${parsed.owner}/connector/<connectorName>]' to address a mate connector.`,
    );
  }
  const name = parsed.segments[parsed.segments.length - 1];
  if (name === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `add_mate: ref '${ref}' has no connector name segment.`,
      undefined,
      `Append the connector name: '@kc[${parsed.owner}/connector/<connectorName>]'.`,
    );
  }
  return `${parsed.owner}.${name}`;
}

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
    const aRef = normalizeConnectorRef(input.a, 'a');
    const bRef = normalizeConnectorRef(input.b, 'b');
    arm.mate(input.name, aRef, bRef, input.type, opts);
    return {
      ok: true,
      mate: {
        name: input.name,
        a: aRef,
        b: bRef,
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
