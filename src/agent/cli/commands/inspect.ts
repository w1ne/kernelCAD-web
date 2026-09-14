// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/inspect.ts
//
// W4 inspection — Task 4: `kernelcad inspect step <file>`. Pure-analysis
// interrogation of an external STEP file: solid tree, exact bbox, volume,
// face count, cylindrical holes. The `inspect` parent leaves room for
// future subcommands (same parent/subcommand shape as `render`).

import { Command } from 'commander';
import {
  inspectStepFile,
  type StepInspectReport,
  type StepSolidReport,
} from '../../inspect/inspectStep';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { formatHuman } from '../../../shared/diagnostics/formatter';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';
import { isKernelError } from '../../../shared/intent/kernelError';
import { inspectContinuityTool } from '../../mcp/tools/inspectContinuity';
import { inspectCurvatureTool } from '../../mcp/tools/inspectCurvature';

export interface InspectStepCliInput {
  file: string;
}

export interface InspectStepCliResult {
  exitCode: number;
  report?: StepInspectReport;
  diagnostics: CompilerDiagnostic[];
}

/**
 * Action behind `kernelcad inspect step`. Exit codes follow the CLI
 * convention: 2 = input file unreadable (inspectStepFile throws
 * `feature.invalid-args` for that — same class of failure as
 * `cli.file-read`), 1 = parse/kernel failure, 0 = success.
 */
export async function inspectStepCli(
  input: InspectStepCliInput,
): Promise<InspectStepCliResult> {
  let report: StepInspectReport;
  try {
    report = await inspectStepFile(input.file);
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e, 'cli.script-exception');
    const unreadable = isKernelError(e) && e.code === 'feature.invalid-args';
    return { exitCode: unreadable ? 2 : 1, diagnostics: [diag] };
  }
  return { exitCode: 0, report, diagnostics: [] };
}

/** `12345.678` → `12345.7`; integral values lose the decimal entirely. */
function num(v: number, decimals = 1): string {
  return String(Number(v.toFixed(decimals)));
}

function formatHole(h: StepSolidReport['holes'][number]): string {
  const o = h.axisOrigin.map((v) => num(v)).join(', ');
  const d = h.axisDirection.map((v) => num(v, 3)).join(', ');
  return `  Ø${num(h.diameterMm)} ${h.kind}, depth ${num(h.depthMm)}, axis (${o}) → (${d})`;
}

/** Human-readable report: one block per solid, one line per hole. */
export function formatStepReport(report: StepInspectReport): string {
  const lines: string[] = [];
  for (const s of report.solids) {
    const name = s.name !== null ? ` '${s.name}'` : '';
    const bbox = ([0, 1, 2] as const)
      .map((i) => `[${num(s.bboxExact.min[i])}..${num(s.bboxExact.max[i])}]`)
      .join('×');
    const holeCount = `${s.holes.length} hole${s.holes.length === 1 ? '' : 's'}`;
    lines.push(
      `solid #${s.index}${name} — bbox ${bbox} mm, volume ${num(s.volumeMm3, 0)} mm³, ` +
        `${s.faceCount} face${s.faceCount === 1 ? '' : 's'}, ${holeCount}` +
        (s.holes.length > 0 ? ':' : ''),
    );
    for (const h of s.holes) lines.push(formatHole(h));
  }
  return lines.join('\n');
}

export function inspectCommand(): Command {
  const cmd = new Command('inspect')
    .description('Inspect a STEP file, or a .kcad.ts script\'s surface quality (continuity / curvature)');
  cmd
    .command('step')
    .description('Report solid tree, exact bbox, volume, and cylindrical holes of a STEP file')
    .argument('<file>', 'path to a .step file')
    .option('--json', 'emit the full report as JSON on stdout', false)
    .action(async (file: string, opts: { json: boolean }) => {
      const r = await inspectStepCli({ file });
      // JSON output follows the export/parts convention: always an
      // { ok, ..., diagnostics } envelope, success and failure alike.
      if (r.report !== undefined) {
        console.log(
          opts.json
            ? JSON.stringify(
                { ok: true, report: r.report, diagnostics: r.diagnostics },
                null,
                2,
              )
            : formatStepReport(r.report),
        );
      } else if (opts.json) {
        console.log(JSON.stringify({ ok: false, diagnostics: r.diagnostics }, null, 2));
      } else if (r.diagnostics.length > 0) {
        console.log(formatHuman(r.diagnostics));
      }
      process.exitCode = r.exitCode;
    });
  cmd
    .command('continuity')
    .description('Classify shared face-edges G0/G1/G2/broken with max G0 gap, G1 normal jump, G2 curvature difference')
    .argument('<file>', 'path to a .kcad.ts script')
    .option('--json', 'emit the full report as JSON on stdout', false)
    .action(async (file: string, opts: { json: boolean }) => {
      const r = await inspectContinuityTool({ file });
      if (opts.json) {
        console.log(JSON.stringify(r, null, 2));
      } else if (!r.ok) {
        console.log(r.error ?? 'inspect continuity failed');
      } else {
        const s = r.summary!;
        console.log(`shared ${s.shared}  G2 ${s.g2}  G1 ${s.g1}  G0 ${s.g0}  broken ${s.broken}`);
        for (const e of r.edges ?? []) {
          console.log(
            `  ${e.ref}  ${e.class}  G0 ${e.maxPositionGapMm.toExponential(2)} mm  ` +
              `G1 ${e.maxNormalAngleDeg.toFixed(2)}°  G2 Δ ${e.maxCurvatureDiff.toExponential(2)}  ` +
              `worst [${e.worstSample.point.map(n => n.toFixed(2)).join(', ')}]`,
          );
        }
        if (r.diagnostics && r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
      }
      process.exitCode = r.ok ? 0 : 1;
    });
  cmd
    .command('curvature')
    .description('Per-face Gaussian and mean curvature min/max/mean, inflections, spikes')
    .argument('<file>', 'path to a .kcad.ts script')
    .option('--json', 'emit the full report as JSON on stdout', false)
    .action(async (file: string, opts: { json: boolean }) => {
      const r = await inspectCurvatureTool({ file });
      if (opts.json) {
        console.log(JSON.stringify(r, null, 2));
      } else if (!r.ok) {
        console.log(r.error ?? 'inspect curvature failed');
      } else {
        for (const f of r.faces ?? []) {
          console.log(
            `  ${f.ref}  ${f.surfaceType}  K min/mean/max ` +
              `${f.gaussian.min.toExponential(2)} / ${f.gaussian.mean.toExponential(2)} / ${f.gaussian.max.toExponential(2)}  ` +
              `H min/mean/max ${f.mean.min.toExponential(2)} / ${f.mean.mean.toExponential(2)} / ${f.mean.max.toExponential(2)}  ` +
              `inflections ${f.inflections}  spikes ${f.spikes.length}`,
          );
        }
        if (r.diagnostics && r.diagnostics.length > 0) console.log(formatHuman(r.diagnostics));
      }
      process.exitCode = r.ok ? 0 : 1;
    });
  return cmd;
}
