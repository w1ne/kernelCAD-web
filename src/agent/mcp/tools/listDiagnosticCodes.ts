// src/mcp/tools/listDiagnosticCodes.ts
//
// Protocol-discoverable view of the kernelCAD diagnostic vocabulary.
// Exists so an agent can pre-populate retry strategies without rummaging
// through SKILL.md.

import {
  DIAGNOSTIC_CODES,
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
  type DiagnosticGroup,
  type DiagnosticSeverityLevel,
} from '../../../shared/diagnostics/registry';
import type { NextAction } from '../../../shared/diagnostics/nextAction';
import { defineMCPTool } from '../defineMCPTool';

export type ListDiagnosticCodesInput = Record<string, never>;

/**
 * One entry per diagnostic code. The legacy `{code, hint_template}` keys
 * are preserved verbatim for back-compat; richer fields are additive.
 */
export interface DiagnosticCodeEntry {
  code: DiagnosticCode;
  hint_template: string;
  /** One-sentence statement of the condition that triggers this code. */
  description: string;
  /** Top-level namespace (matches the code prefix). */
  group: DiagnosticGroup;
  /** Dominant emit-site severity ('info' | 'warn' | 'error'). */
  default_severity: DiagnosticSeverityLevel;
  /** Structured form of the recovery instruction. */
  next_action: NextAction;
}

export interface ListDiagnosticCodesOutput {
  ok: true;
  codes: DiagnosticCodeEntry[];
}

export async function listDiagnosticCodesTool(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _input: ListDiagnosticCodesInput,
): Promise<ListDiagnosticCodesOutput> {
  return {
    ok: true,
    codes: DIAGNOSTIC_CODES.map((code) => {
      const spec = DIAGNOSTIC_REGISTRY[code];
      return {
        code,
        hint_template: spec.hintTemplate,
        description: spec.description,
        group: spec.group,
        default_severity: spec.defaultSeverity,
        next_action: spec.nextAction,
      };
    }),
  };
}

export const listDiagnosticCodesMcpTool = defineMCPTool<ListDiagnosticCodesInput>({
  name: 'list_diagnostic_codes',
  description:
    'Return the kernelCAD 26-code diagnostic catalogue with hint templates. ' +
    'Tiny one-shot call; useful for an agent that wants to pre-populate ' +
    'retry strategies. Hints are also inline on every emitted diagnostic — ' +
    'this tool just gives you the canonical list up front.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: listDiagnosticCodesTool,
});
