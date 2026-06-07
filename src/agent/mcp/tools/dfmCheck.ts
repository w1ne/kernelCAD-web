// src/agent/mcp/tools/dfmCheck.ts
//
// MCP `dfm_check` tool — W3 Task 8. Runs the print-readiness gates declared
// by the script's dfmSpec(...) and returns the flattened report payload
// `{ ok, clearance, walls, voids, timings, diagnostics }` (the
// get_bend_table / list_part_stats sibling convention). Accepts `{ file }`
// or `{ code }` via the evaluateAndBuildScript resolution idiom, which also
// hosts the gate hook — this tool surfaces the report struct the
// evaluate_script envelope omits.
//
// Distinct from `dfm_preflight` (vendor job-shop ordering rules over sheet
// metal): dfm_check enforces the SCRIPT-declared printability gates.

import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { noDfmSpecDiagnostic } from '../../cli/commands/dfm';
import type { DfmCheckReport } from '../../../modeling/runtime/dfm/runDfmChecks';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface DfmCheckInput {
  file?: string;
  code?: string;
}

export interface DfmCheckOutput {
  ok: boolean;
  clearance: DfmCheckReport['clearance'];
  walls: DfmCheckReport['walls'];
  voids: DfmCheckReport['voids'];
  /** Per-phase wall time (ms); present when the gates ran. */
  timings?: DfmCheckReport['timings'];
  diagnostics: CompilerDiagnostic[];
}

export async function dfmCheckTool(input: DfmCheckInput): Promise<DfmCheckOutput> {
  let built;
  try {
    built = await evaluateAndBuildScript(input);
  } catch (e) {
    // KernelError carries its own code + hint (errorHint surface); anything
    // else falls back to cli.script-exception with the catalogue hint.
    return { ok: false, clearance: [], walls: [], voids: [], diagnostics: [kernelErrorToDiagnostic(e)] };
  }
  const { evaluation, dfmReport } = built;

  if (dfmReport === undefined) {
    // Either the invocation/build failed (surface those diagnostics) or the
    // script declares no dfmSpec — a no-op is an error for a gate tool.
    const diagnostics = evaluation.exitCode === 0
      ? withNextActions([...evaluation.diagnostics, noDfmSpecDiagnostic()])
      : evaluation.diagnostics;
    return { ok: false, clearance: [], walls: [], voids: [], diagnostics };
  }

  return {
    ok: evaluation.exitCode === 0,
    clearance: dfmReport.clearance,
    walls: dfmReport.walls,
    voids: dfmReport.voids,
    timings: dfmReport.timings,
    diagnostics: evaluation.diagnostics,
  };
}
