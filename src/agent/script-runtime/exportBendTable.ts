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

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** `<safe name>.csv`, unique even on a case-insensitive file system, and never
 *  a Windows device name (CON, NUL, COM1 ...; those match before the extension). */
function uniqueFileName(name: string, taken: Set<string>): string {
  const safe = fileSafePartName(name);
  const base = WINDOWS_RESERVED.test(safe.split('.')[0]) ? `tube-${safe}` : safe;
  let file = `${base}.csv`;
  for (let n = 2; taken.has(file.toLowerCase()); n++) file = `${base}-${n}.csv`;
  taken.add(file.toLowerCase());
  return file;
}

/** One distinct, file-system-safe `.csv` name per tube name, in order. */
export function bendTableFileNames(names: readonly string[]): string[] {
  const taken = new Set<string>();
  return names.map((n) => uniqueFileName(n, taken));
}

/** A refusal always carries an error diagnostic, so no writer can report success with nothing written. */
function refusal(featureCount: number, diagnostics: CompilerDiagnostic[]): ExportResult {
  if (diagnostics.some((d) => d.severity === 'error')) return REFUSED(featureCount, diagnostics);
  return REFUSED(featureCount, [...diagnostics, {
    target: 'export-occt',
    code: 'feature.kernel-failed',
    severity: 'error',
    message: 'The script did not evaluate cleanly, so no bend table was written.',
    hint: 'Run evaluate_script on the script and fix its diagnostics, then re-export.',
  }]);
}

export async function exportBendTable(input: ExportInput): Promise<ExportResult> {
  const { evaluation, tubeReport } = await evaluateAndBuildScript({
    code: input.code,
    ...(input.scriptDir !== undefined ? { scriptDir: input.scriptDir } : {}),
  });
  const featureCount = evaluation.featureCount;
  // A build failure or a tube-gate error refuses the export: a bender must not
  // be handed a table for a line the rules reject (same as `evaluate`).
  if (evaluation.exitCode !== 0) return refusal(featureCount, evaluation.diagnostics);
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
  const fileNames = bendTableFileNames(tubeReport.lines.map((l) => l.name));
  const tables: CompanionMeshFile[] = tubeReport.lines.map((line, i) => ({
    relPath: fileNames[i],
    bytes: encoder.encode(formatBendTableCsv(line.name, line.od, line.wall, {
      lra: line.lra, lastStraight: line.lastStraight, xyz: line.xyz,
      bendRadius: line.bendRadius, cutLength: line.cutLength,
    }, {
      ...(line.from !== undefined ? { from: line.from } : {}),
      ...(line.to !== undefined ? { to: line.to } : {}),
      ...(line.branches !== undefined ? { branches: line.branches } : {}),
    })),
  }));
  return { bytes: tables[0].bytes, tables, featureCount, diagnostics: evaluation.diagnostics };
}
