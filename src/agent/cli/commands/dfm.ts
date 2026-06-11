// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/dfm.ts
//
// `kernelcad dfm <file.kcad.ts>` — run the print-readiness gates declared
// by the script's dfmSpec(...): part-pair clearance (exact BREP distance),
// minimum wall thickness (inward ray sampling), and void/channel topology
// (voxel flood-fill). W3 Task 8 surface over `runDfmChecksOnModel`.
//
// Exit codes (pipe-friendly: `kernelcad dfm part.kcad.ts && echo ok`):
//   0 — every declared gate passed,
//   1 — a gate failed (error-severity diagnostic present) or the build
//       itself had fatal diagnostics (which short-circuit the gates),
//   2 — unusable invocation: unreadable file, or the script declares no
//       dfmSpec(...) (the gates are opt-in; nothing to enforce).
//
// 'unknown' clearance pairs and kernel-failed parts stay warn severity by
// the runDfmChecks contract — they surface in the report and the summary
// (`, N unknown`) but never flip the exit code.

import { Command } from 'commander';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from './evaluate';
import type { DfmCheckReport } from '../../../modeling/runtime/dfm/runDfmChecks';
import { formatHuman } from '../../../shared/diagnostics/formatter';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';

export interface DfmCliInput {
  file: string;
}

export interface DfmCliResult {
  exitCode: number;
  /** Full gate report; undefined when the build failed or no dfmSpec. */
  report?: DfmCheckReport;
  /** Build diagnostics + merged DFM gate diagnostics. */
  diagnostics: CompilerDiagnostic[];
  /** One-line evidence summary; present whenever the gates ran. */
  summary?: string;
}

/** The exit-2 "nothing to enforce" diagnostic, shared with the MCP
 *  `dfm_check` tool so both surfaces report the no-spec case identically. */
export function noDfmSpecDiagnostic(): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'cli.invalid-args',
    severity: 'error',
    message:
      'dfm: the script declares no dfmSpec(...) — the DFM gates are opt-in and there is nothing to enforce.',
    hint:
      'Declare the gates in the script, e.g. dfmSpec({ minWall: 1.2, minClearance: 0.45, ' +
      "channels: [{ part: 'shape', name: 'bore', openings: 2 }] }), then re-run.",
  };
}

/** `DFM: <p> parts, <c> clearance pairs, <w> wall clusters, <v> voids — <PASS|FAIL>`
 *  with `, N unknown` appended before the verdict when any clearance pair
 *  could not be measured (unknowns never flip the exit code). */
export function formatDfmSummary(report: DfmCheckReport): string {
  const parts = new Set<string>();
  for (const w of report.walls) parts.add(w.part);
  for (const v of report.voids) parts.add(v.part);
  for (const c of report.clearance) {
    parts.add(c.a);
    parts.add(c.b);
  }
  const wallClusters = report.walls.reduce((n, w) => n + w.result.violations.length, 0);
  const sealedVoids = report.voids.reduce((n, v) => n + v.result.sealedVoids.length, 0);
  const unknown = report.clearance.filter(c => c.status === 'unknown').length;
  const fail = report.diagnostics.some(d => d.severity === 'error');
  return (
    `DFM: ${parts.size} parts, ${report.clearance.length} clearance pairs, ` +
    `${wallClusters} wall clusters, ${sealedVoids} voids` +
    (unknown > 0 ? `, ${unknown} unknown` : '') +
    ` — ${fail ? 'FAIL' : 'PASS'}`
  );
}

export async function dfmScript(input: DfmCliInput): Promise<DfmCliResult> {
  await initOcct();
  // evaluateAndBuildScript hosts the DFM hook: it maps unreadable files to
  // exit 2 (cli.file-read), runs the gates after a clean build, and merges
  // the gate diagnostics — this command adds the report/summary surface.
  const { evaluation, dfmReport } = await evaluateAndBuildScript({ file: input.file });

  if (dfmReport === undefined) {
    if (evaluation.exitCode !== 0) {
      // Unreadable file (2) or fatal build diagnostics (1) short-circuit.
      return { exitCode: evaluation.exitCode, diagnostics: evaluation.diagnostics };
    }
    return {
      exitCode: 2,
      diagnostics: withNextActions([...evaluation.diagnostics, noDfmSpecDiagnostic()]),
    };
  }

  // Exit by error-diagnostic presence — evaluation.exitCode already derives
  // from the merged build + gate diagnostics.
  return {
    exitCode: evaluation.exitCode,
    report: dfmReport,
    diagnostics: evaluation.diagnostics,
    summary: formatDfmSummary(dfmReport),
  };
}

export function dfmCommand(): Command {
  const cmd = new Command('dfm')
    .description('Run the print-readiness gates declared by dfmSpec(): clearance, min wall, void/channel topology')
    .argument('<file>', 'path to .kcad.ts script')
    .option('--json', 'emit the full DFM report as JSON')
    .action(async (file: string, opts: { json?: boolean }) => {
      const r = await dfmScript({ file });
      if (opts.json) {
        console.log(JSON.stringify({
          ok: r.exitCode === 0,
          ...(r.report !== undefined ? { report: r.report } : {}),
          diagnostics: r.diagnostics,
        }, null, 2));
      } else {
        if (r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
        if (r.summary !== undefined) console.log(r.summary);
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
