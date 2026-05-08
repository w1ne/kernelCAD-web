// src/mcp/tools/evaluateScript.ts
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { withNextActions } from '../../diagnostics/diagnostic';
import { clearActiveMcpSession, setActiveMcpSession } from '../activeSession';

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
  const { evaluation: r, model } = await evaluateAndBuildScript(input as EvaluateInput);
  if (r.exitCode === 0) {
    setActiveMcpSession({
      session: model!.session,
      tailId: model!.tailId,
      tailShape: model!.tailShape,
    });
  } else {
    clearActiveMcpSession();
  }
  return {
    ok: r.exitCode === 0,
    featureCount: r.featureCount,
    // Defense-in-depth: enrich at the wire boundary even if upstream
    // already populated `nextAction`. Idempotent — `withNextActions`
    // leaves any explicitly-set value in place.
    diagnostics: withNextActions(r.diagnostics),
  };
}
