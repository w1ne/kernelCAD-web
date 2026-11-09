// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { runScript } from '../../composition/runScript';
import { exportDxf, type DxfWriterOptions } from '../../kernel/backends/occt/exportDxf';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { flattenPatternWithHoles } from '../../modeling/sheetMetalFlatPattern';
import { findRootSheetMetalRecord } from '../../modeling/sheetMetal';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { exportShapeDxfProfile } from './exportDxfProfiles';
import type { ExportInput, ExportResult } from './export';

/** Thickness of the sheet a bent part is made from, read off its root
 *  `sheetMetal` record. */
function sheetThickness(records: readonly FeatureRecord[], targetId: string): number | undefined {
  const target = records.find((rec) => rec.id === targetId);
  const root = target ? findRootSheetMetalRecord(target, records) : undefined;
  const value = (root?.params.thickness as { evaluated?: unknown } | undefined)?.evaluated;
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/** Single-shape DXF path: sheet-metal lineage flattens to a Region; a flat
 *  part exports its outline, `options.section` its cross-section; anything
 *  else emits the non-planar diagnostic. */
export async function exportShapeDxf(
  shape: OcctBackend,
  targetId: string,
  exportOptions: ExportInput['options'],
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const opts = (exportOptions as DxfWriterOptions | undefined) ?? { format: 'dxf' };
  const tracesToSheetMetal = (() => {
    const byId = new Map(run.records.map(rec => [rec.id, rec]));
    let cur = byId.get(targetId);
    for (let i = 0; cur && i <= run.records.length; i++) {
      if (cur.kind === 'sheetMetal') return true;
      const baseRef = cur.inputs.base ?? cur.inputs.target;
      if (!baseRef || baseRef.kind !== 'feature') return false;
      cur = byId.get(baseRef.id);
    }
    return false;
  })();
  const wantsSection = (opts as { section?: unknown }).section !== undefined;
  if (tracesToSheetMetal && !wantsSection) {
    try {
      const region = await flattenPatternWithHoles(run.records, targetId, undefined, run.paramTable);
      const bytes = exportDxf({ kind: 'region', region }, opts);
      const thicknessMm = sheetThickness(run.records, targetId);
      const sheet = thicknessMm ? { thicknessMm, bendCount: region.bendLines.length } : undefined;
      return { bytes, featureCount, diagnostics, ...(sheet ? { sheet } : {}) };
    } catch (e) {
      return sheetMetalDxfFailure(e, targetId, diagnostics, featureCount);
    }
  }
  return exportShapeDxfProfile(shape, targetId, exportOptions, diagnostics, featureCount);
}

function sheetMetalDxfFailure(
  error: unknown,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  const errCode = (error as { code?: string }).code;
  const message = error instanceof Error ? error.message : String(error);
  const hint = (error as { hint?: string }).hint;
  if (errCode === 'feature.flattenPattern.multi-bend-unsupported') {
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...diagnostics, {
        target: 'export-occt',
        code: 'feature.flattenPattern.multi-bend-unsupported',
        featureId: targetId,
        severity: 'error',
        message,
        hint: hint ?? 'Flatten an upstream Shape with at most two bends, or wait for the multi-bend slice.',
        nextAction: NEXT_ACTIONS['feature.flattenPattern.multi-bend-unsupported'],
      }],
    };
  }
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.dxf.non-planar',
      featureId: targetId,
      severity: 'error',
      message: `DXF export could not flatten the sheet-metal chain: ${message}`,
      hint: hint ?? 'Inspect the sheetMetal root and bends, then retry. Return a Region directly to bypass.',
      nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
    }],
  };
}
