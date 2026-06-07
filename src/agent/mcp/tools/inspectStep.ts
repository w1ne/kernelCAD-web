// src/agent/mcp/tools/inspectStep.ts
//
// MCP tool: inspect a STEP file without evaluating a script — solid tree
// (index + best-effort name), per-solid exact bbox + volume, and detected
// cylindrical holes. Thin wrapper over the W4 inspect orchestrator; unlike
// the script tools this takes a STEP file path directly ({ file } is
// required, no { code } mode).

import { inspectStepFile, type StepInspectReport } from '../../inspect/inspectStep';

export interface InspectStepInput {
  file: string;
}

export interface InspectStepOutput {
  ok: boolean;
  report?: StepInspectReport;
  error?: string;
  /** Structured diagnostic code on `ok=false`: `feature.invalid-args` for a
   *  missing/unreadable file, `feature.kernel-failed` for bytes that do not
   *  parse as a STEP model, `cli.script-exception` for non-kernel throws. */
  errorCode?: string;
}

export async function inspectStepTool(input: InspectStepInput): Promise<InspectStepOutput> {
  if (typeof input.file !== 'string' || input.file.length === 0) {
    return {
      ok: false,
      error: 'inspect_step: { file } is required.',
      errorCode: 'feature.invalid-args',
    };
  }
  try {
    return { ok: true, report: await inspectStepFile(input.file) };
  } catch (e) {
    const code = (e as { code?: string }).code ?? 'cli.script-exception';
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: code,
    };
  }
}
