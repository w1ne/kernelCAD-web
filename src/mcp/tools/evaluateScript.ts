// src/mcp/tools/evaluateScript.ts
import { evaluateScript, type EvaluateInput, type EvaluateResult } from '../../cli/commands/evaluate';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { clearActiveMcpSession, establishActiveMcpSession } from '../activeSession';

export interface EvaluateScriptInput {
  file?: string;
  code?: string;
}

export interface EvaluateScriptOutput {
  ok: boolean;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

/**
 * MCP `evaluate_script` tool — runs a kernelCAD script and reports
 * pass/fail + feature count + diagnostics. One-of `{ file }` (path on
 * disk) or `{ code }` (inline source). Returns a JSON-serializable
 * envelope agents can reason over.
 *
 * No side effects — does not write to disk.
 */
export async function evaluateScriptTool(
  input: EvaluateScriptInput,
): Promise<EvaluateScriptOutput> {
  const r: EvaluateResult = await evaluateScript(input as EvaluateInput);
  if (r.exitCode === 0) {
    await establishActiveMcpSession(input);
  } else {
    clearActiveMcpSession();
  }
  return {
    ok: r.exitCode === 0,
    featureCount: r.featureCount,
    diagnostics: r.diagnostics,
  };
}
