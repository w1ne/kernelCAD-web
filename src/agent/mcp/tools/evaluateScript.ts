// src/mcp/tools/evaluateScript.ts
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { clearActiveMcpSession, setActiveMcpSession } from '../activeSession';
import { defineMCPTool } from '../defineMCPTool';

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
    // Idempotent re-enrichment guard. evaluateAndBuildScript already
    // populates nextAction on every return path; this wrap is a no-op
    // today but ensures the contract holds if a future caller bypasses
    // the eval helper.
    diagnostics: withNextActions(r.diagnostics),
  };
}

export const evaluateScriptMcpTool = defineMCPTool<EvaluateScriptInput>({
  name: 'evaluate_script',
  description:
    'Run a kernelCAD .kcad.ts script and report pass/fail + feature count + diagnostics. ' +
    'Pass either { file: "<path>" } or { code: "<inline source>" }.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
      code: { type: 'string', description: 'Inline kernelCAD script source.' },
    },
  },
  handler: evaluateScriptTool,
});
