// src/mcp/tools/listDiagnosticCodes.ts
//
// Protocol-discoverable view of the kernelCAD diagnostic vocabulary.
// Exists so an agent can pre-populate retry strategies without rummaging
// through SKILL.md.

import { DIAGNOSTIC_CODES, HINT_TEMPLATES, type DiagnosticCode } from '../../../shared/diagnostics/codes';

export type ListDiagnosticCodesInput = Record<string, never>;

export interface DiagnosticCodeEntry {
  code: DiagnosticCode;
  hint_template: string;
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
    codes: DIAGNOSTIC_CODES.map((code) => ({
      code,
      hint_template: HINT_TEMPLATES[code].template,
    })),
  };
}
