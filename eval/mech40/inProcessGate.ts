// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40/inProcessGate.ts — the agent loop's gate for mech40: the same
// `evaluate_script` verdict an MCP agent sees, run in-process (no CLI build
// needed). Warn/error diagnostics fail the attempt; info is advisory.
import { resolve } from 'node:path';
import type { GateReport, GateRunner, GateVerdict } from '../../src/agent/loop/types';
import { evaluateScriptTool } from '../../src/agent/mcp/tools/evaluateScript';

export function verdictsFromEvaluation(r: {
  ok: boolean;
  diagnostics: readonly { code: string; message: string; severity?: string; hint?: string; featureId?: string }[];
}): GateVerdict[] {
  const blocking = r.diagnostics.filter((d) => d.severity !== 'info');
  if (blocking.length === 0) {
    return [{ gate: 'evaluate', ok: r.ok, message: r.ok ? 'Script evaluated cleanly.' : 'Script evaluation failed.' }];
  }
  return blocking.map((d) => ({
    gate: 'evaluate',
    ok: false,
    code: d.code,
    message: d.message,
    ...(d.hint !== undefined ? { hint: d.hint } : {}),
    ...(d.featureId !== undefined ? { locus: d.featureId } : {}),
  }));
}

export function createInProcessGateRunner(): GateRunner {
  return {
    async run(scriptPath: string): Promise<GateReport> {
      try {
        const r = await evaluateScriptTool({ file: resolve(scriptPath) });
        const verdicts = verdictsFromEvaluation(r as never);
        return { ok: verdicts.every((v) => v.ok), verdicts };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, verdicts: [{ gate: 'evaluate', ok: false, code: 'eval.gate-exception', message }] };
      }
    },
  };
}
