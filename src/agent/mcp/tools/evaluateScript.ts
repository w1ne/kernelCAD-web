// src/mcp/tools/evaluateScript.ts
import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
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
  const { evaluation: r, model, dfmReport } = await evaluateAndBuildScript(input as EvaluateInput);
  // Session policy: keep/refresh the active session whenever the model
  // BUILD succeeded — even when dfm gate diagnostics made the evaluation
  // fatal (exitCode 1). The dfm hook only runs after a clean build and
  // pushes `dfmReport.diagnostics` into `model.diagnostics` by reference,
  // so the build was clean iff every error-severity diagnostic came from
  // the dfm report. Without this, a dfm-only failure would lock the agent
  // out of the 9 session-dependent tools exactly while iterating on the
  // dfm fix. Genuine build failures (model missing or non-dfm errors)
  // still clear the session — its shapes would be stale or absent.
  const dfmErrors = new Set(dfmReport?.diagnostics ?? []);
  const buildSucceeded =
    model !== undefined &&
    model.diagnostics.every(d => d.severity !== 'error' || dfmErrors.has(d));
  if (buildSucceeded) {
    setActiveMcpSession({
      session: model.session,
      tailId: model.tailId,
      tailShape: model.tailShape,
      rootId: model.rootId,
      rootShape: model.rootShape,
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
