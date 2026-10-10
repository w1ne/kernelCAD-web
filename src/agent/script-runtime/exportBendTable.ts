// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/exportBendTable.ts
//
// `export({ format: 'bend-table' })`: one CSV per tube, the table a tube
// bender needs. Derived from the evaluated model's tube report (the same
// numbers `evaluate_script` returns as `tubes`), so it needs no solid and does
// no file I/O here; the CLI and MCP writers place `tables` in the output
// directory.
import { evaluateAndBuildScript } from '../../composition/scriptEvaluation';
import { formatBendTableCsv } from '../../shared/tube/bendTable';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { fileSafePartName } from './safeOutputPath';
import type { CompanionMeshFile, ExportInput, ExportResult } from './export';

const REFUSED = (featureCount: number, diagnostics: CompilerDiagnostic[]): ExportResult =>
  ({ bytes: new Uint8Array(), featureCount, diagnostics });

/** `<safe name>.csv`, de-duplicated when two names sanitise to the same file. */
function uniqueFileName(name: string, taken: Set<string>): string {
  const base = fileSafePartName(name);
  let file = `${base}.csv`;
  for (let n = 2; taken.has(file); n++) file = `${base}-${n}.csv`;
  taken.add(file);
  return file;
}

export async function exportBendTable(input: ExportInput): Promise<ExportResult> {
  const { evaluation, tubeReport } = await evaluateAndBuildScript({
    code: input.code,
    ...(input.scriptDir !== undefined ? { scriptDir: input.scriptDir } : {}),
  });
  const featureCount = evaluation.featureCount;
  // A build failure or a tube-gate error refuses the export: a bender must not
  // be handed a table for a line the rules reject (same as `evaluate`).
  if (evaluation.exitCode !== 0) return REFUSED(featureCount, evaluation.diagnostics);
  if (tubeReport === undefined || tubeReport.lines.length === 0) {
    return REFUSED(featureCount, [...evaluation.diagnostics, {
      target: 'export-occt',
      code: 'export.bend-table.no-tubes',
      severity: 'error',
      message: 'The script declares no tube(), so there is no bend table to export.',
      hint: 'Declare at least one tube() in the script before exporting a bend table.',
      nextAction: NEXT_ACTIONS['export.bend-table.no-tubes'],
    }]);
  }
  const encoder = new TextEncoder();
  const taken = new Set<string>();
  const tables: CompanionMeshFile[] = tubeReport.lines.map((line) => ({
    relPath: uniqueFileName(line.name, taken),
    bytes: encoder.encode(formatBendTableCsv(line.name, line.od, line.wall, {
      lra: line.lra, lastStraight: line.lastStraight, xyz: line.xyz,
      bendRadius: line.bendRadius, cutLength: line.cutLength,
    })),
  }));
  return { bytes: tables[0].bytes, tables, featureCount, diagnostics: evaluation.diagnostics };
}
