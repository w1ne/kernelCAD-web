// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/index.ts
//
// drawing_to_cad — an engineering-drawing PDF page in, an editable `.kcad.ts`
// part plus an assumption ledger out. Deterministic, no model calls:
//
//   1. pdfVectors   — vector paths (width, dash) and positioned text
//   2. sheet        — frame/title block, scale, units, projection symbol;
//                     arrowheads → dimension / extension / leader lines;
//                     geometry by weight and dash (visible/hidden/center)
//   3. views        — islands of linework → front/top/side by projection
//                     alignment; pictorials excluded
//   4–5. reconstruct — dimensions snap levels; extrude or revolve; holes
//   6. emit          — role-named params + the build
//   7. verify        — evaluate, re-project through the svg-drawing view
//                     stage, compare extents / holes / silhouettes
//
// Never throws: every failure is a diagnostic on an `ok: false` result.
// Spec: kernelCAD-private/docs/specs/2026-09-14-pdf-to-cad-design.md.

import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import type { AssumptionFact, AssumptionLedger } from '../vision/ledger';
import { MM_PER_UNIT } from '../../kernel/import/lengthUnits';
import { PdfReadError, readPdfPageVectors } from './pdfVectors';
import { analyseSheet, type SheetAnalysis } from './sheet';
import { identifyViews } from './views';
import { reconstructPart, type ParamDecl, type PartModel } from './reconstruct';
import { emitKcadScript } from './emit';
import type { FidelityReport } from './verify';
import type { ModelAxis } from './views';

export type { FidelityReport, FidelityVerdict } from './verify';
export type { ParamDecl, PartModel } from './reconstruct';

export interface DrawingToCadInput {
  /** The PDF file's bytes. */
  pdf: Uint8Array;
  /** How to name the source in the script header and messages (e.g. the file name). */
  source: string;
  /** 1-based page number. Default 1. */
  page?: number;
  /** Override the projection angle read from the sheet. */
  projection?: 'third-angle' | 'first-angle';
  /** Evaluate and re-project the result (default true). */
  verify?: boolean;
  /** Ledger path to cite in the script header (`// Ledger: ...`). */
  ledgerPath?: string;
}

export interface DrawingToCadResult {
  ok: boolean;
  page: number;
  pageCount: number;
  sheet?: {
    widthMm: number;
    heightMm: number;
    scale: { text: string; sheetPerModel: number; source: 'title-block' | 'dimensions' | 'default' };
    units: 'mm' | 'in';
    projection: 'third-angle' | 'first-angle';
  };
  views: Array<{ name: string; bboxMm: [number, number, number, number]; identifiedBy: string; label?: string }>;
  reconstruction?: {
    kind: PartModel['kind'];
    profileView: string;
    axis: ModelAxis;
    holeCount: number;
    extents: Record<ModelAxis, number>;
  };
  params: ParamDecl[];
  script?: string;
  ledger: AssumptionLedger;
  fidelity?: FidelityReport;
  diagnostics: CompilerDiagnostic[];
}

function diag(code: DiagnosticCode, severity: CompilerDiagnostic['severity'], message: string): CompilerDiagnostic {
  return { target: 'export-occt', code, severity, message, hint: HINT_TEMPLATES[code].template, nextAction: NEXT_ACTIONS[code] };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function ledgerOf(facts: AssumptionFact[]): AssumptionLedger {
  return { facts, unresolvedCount: facts.filter(f => f.resolution === 'open').length };
}

function scaleLabel(sheetPerModel: number): string {
  if (sheetPerModel >= 1) return `${r2(sheetPerModel)}:1`;
  return `1:${r2(1 / sheetPerModel)}`;
}

/** Median model-mm-per-sheet-mm over the sheet's plain linear dimensions. */
function dimensionScale(sheet: SheetAnalysis, mmPerUnit: number): { modelPerSheet: number; count: number; spread: number } | null {
  const ratios = sheet.linearDims
    .filter(d => d.parsed.kind === 'linear' && !d.parsed.reference && d.sheetLength > 1)
    .map(d => (d.parsed.value * mmPerUnit) / d.sheetLength)
    .sort((a, b) => a - b);
  if (ratios.length === 0) return null;
  const median = ratios[Math.floor(ratios.length / 2)];
  const agree = ratios.filter(r => Math.abs(r / median - 1) <= 0.01).length;
  return { modelPerSheet: median, count: ratios.length, spread: agree / ratios.length };
}

/** Run the full drawing-to-CAD pipeline on one PDF page. Never throws. */
export async function drawingToCad(input: DrawingToCadInput): Promise<DrawingToCadResult> {
  try {
    return await runPipeline(input);
  } catch (e) {
    // A sheet the stages cannot make sense of must still come back as a
    // diagnostic, not as an exception through the MCP boundary.
    return {
      ok: false,
      page: input.page ?? 1,
      pageCount: 0,
      views: [],
      params: [],
      ledger: ledgerOf([]),
      diagnostics: [diag('reference.drawing.view-ambiguous', 'error', `${input.source}: the sheet could not be interpreted as a multiview drawing (${e instanceof Error ? e.message : String(e)}).`)],
    };
  }
}

async function runPipeline(input: DrawingToCadInput): Promise<DrawingToCadResult> {
  const page = input.page ?? 1;
  const diagnostics: CompilerDiagnostic[] = [];
  const fail = (d: CompilerDiagnostic, pageCount = 0): DrawingToCadResult => ({
    ok: false, page, pageCount, views: [], params: [], ledger: ledgerOf([]), diagnostics: [...diagnostics, d],
  });

  let vectors: Awaited<ReturnType<typeof readPdfPageVectors>>;
  try {
    vectors = await readPdfPageVectors(input.pdf, page);
  } catch (e) {
    const msg = e instanceof PdfReadError ? e.message : `could not read the PDF: ${e instanceof Error ? e.message : String(e)}`;
    return fail(diag('cli.file-read', 'error', `${input.source}: ${msg}`));
  }

  const strokes = vectors.paths.filter(p => p.stroked).length;
  if (vectors.imageCount > 0 && strokes < 8) {
    return fail(diag(
      'reference.drawing.raster-only',
      'error',
      `${input.source} page ${page} is a raster image (${vectors.imageCount} image(s) covering ${Math.round(vectors.imageCoverage * 100)}% of the page, ${strokes} vector stroke(s)); there is no linework or dimension text to read.`,
    ), vectors.pageCount);
  }

  const sheet = analyseSheet(vectors);
  const facts: AssumptionFact[] = [];

  // Units.
  const units: 'mm' | 'in' = sheet.title.units?.value ?? 'mm';
  const mmPerUnit = units === 'in' ? MM_PER_UNIT.in : MM_PER_UNIT.mm;
  facts.push(sheet.title.units
    ? { id: 'units', statement: `Units '${sheet.title.units.text}' read from the title block.`, kind: 'visible', evidence: { source: 'title-block' }, value: units, confidence: 1, resolution: 'confirmed' }
    : { id: 'units', statement: 'No units stated on the sheet; dimensions are read as millimetres.', kind: 'assumed', evidence: { source: 'default' }, value: 'mm', confidence: 0, resolution: 'open' });

  // Scale: title block, cross-checked against the dimensions.
  const fromDims = dimensionScale(sheet, mmPerUnit);
  let sheetPerModel = 1;
  let scaleSource: 'title-block' | 'dimensions' | 'default' = 'default';
  if (sheet.title.scale) {
    sheetPerModel = sheet.title.scale.value;
    scaleSource = 'title-block';
    const dimsSay = fromDims ? 1 / fromDims.modelPerSheet : null;
    if (dimsSay !== null && fromDims!.count >= 2 && fromDims!.spread >= 0.66 && Math.abs(dimsSay / sheetPerModel - 1) > 0.02) {
      facts.push({
        id: 'scale',
        statement: `Title block says ${sheet.title.scale.text}, but ${Math.round(fromDims!.spread * fromDims!.count)} of ${fromDims!.count} dimensions agree the sheet is drawn at ${scaleLabel(dimsSay)}. The dimensions' scale is used for undimensioned (measured) values.`,
        kind: 'visible', evidence: { source: 'title-block' }, value: scaleLabel(dimsSay), confidence: fromDims!.spread, resolution: 'open',
      });
      sheetPerModel = dimsSay;
      scaleSource = 'dimensions';
    } else {
      facts.push({ id: 'scale', statement: `Sheet scale ${sheet.title.scale.text} read from the title block.`, kind: 'visible', evidence: { source: 'title-block' }, value: sheet.title.scale.text, confidence: 1, resolution: 'confirmed' });
    }
  } else if (fromDims) {
    sheetPerModel = 1 / fromDims.modelPerSheet;
    scaleSource = 'dimensions';
    facts.push({ id: 'scale', statement: `No scale lettered; the dimensions put the sheet at ${scaleLabel(sheetPerModel)} (${Math.round(fromDims.spread * 100)}% of ${fromDims.count} dimension(s) agree).`, kind: 'inferred', evidence: { source: 'dimension' }, value: scaleLabel(sheetPerModel), confidence: r2(fromDims.spread), resolution: 'open' });
  } else {
    facts.push({ id: 'scale', statement: 'No scale lettered and no dimensions to infer it from; the sheet is read at 1:1.', kind: 'assumed', evidence: { source: 'default' }, value: '1:1', confidence: 0, resolution: 'open' });
  }

  // Projection angle.
  const callerAngle = input.projection === 'first-angle' ? 'first' : input.projection === 'third-angle' ? 'third' : undefined;
  const angle = callerAngle ?? sheet.title.projection?.value;
  const viewSet = identifyViews(sheet.paths, sheet.notes, angle);

  if (viewSet.views.length === 0) {
    if (vectors.imageCount > 0) {
      return fail(diag('reference.drawing.raster-only', 'error', `${input.source} page ${page} has no vector drawing views — its content is ${vectors.imageCount} raster image(s).`), vectors.pageCount);
    }
    return fail(diag('reference.drawing.view-ambiguous', 'error', `${input.source} page ${page}: no orthographic view could be identified in the vector linework.`), vectors.pageCount);
  }
  const angleName = viewSet.projection === 'first' ? 'first-angle' : 'third-angle';
  facts.push(callerAngle
    ? { id: 'projection', statement: `Projection ${angleName}, as the caller stated.`, kind: 'visible', evidence: { source: 'prior' }, value: angleName, confidence: 1, resolution: 'confirmed' }
    : sheet.title.projection
      ? { id: 'projection', statement: `Projection ${angleName}, read from the title block ${sheet.title.projection.source === 'symbol' ? 'projection symbol' : 'text'}.`, kind: 'visible', evidence: { source: 'title-block' }, value: angleName, confidence: 1, resolution: 'confirmed' }
      : { id: 'projection', statement: 'No projection symbol or note on the sheet; views are read as third-angle.', kind: 'assumed', evidence: { source: 'default' }, value: angleName, confidence: 0, resolution: viewSet.views.length > 1 ? 'open' : 'confirmed' });
  const viewNames = viewSet.views.map(v => v.name);
  facts.push({
    id: 'views',
    statement: `Views ${viewNames.join(', ')} identified by ${viewSet.views.some(v => v.identifiedBy === 'alignment') ? 'projection alignment' : 'position'}${viewSet.pictorials.length ? `; ${viewSet.pictorials.length} pictorial view(s) ignored` : ''}${viewSet.unplaced.length ? `; ${viewSet.unplaced.length} view(s) aligned with nothing and were not used` : ''}.`,
    kind: viewSet.ambiguities.length ? 'inferred' : 'visible', evidence: { source: 'linework' }, value: viewNames,
    confidence: viewSet.ambiguities.length ? 0.5 : 1, resolution: viewSet.ambiguities.length ? 'open' : 'confirmed',
  });
  for (const a of viewSet.ambiguities) diagnostics.push(diag('reference.drawing.view-ambiguous', 'warn', a));
  if (viewSet.views.length === 1) {
    const lone = viewSet.views[0];
    diagnostics.push(diag('reference.drawing.view-ambiguous', 'warn', lone.identifiedBy === 'label'
      ? `only one orthographic view was found; its caption '${lone.label}' names it the ${lone.name} view.`
      : `only one orthographic view was found and it carries no caption; it was read as the top (plan) view.`));
  }

  const rec = reconstructPart({ sheet, viewSet, sheetPerModel, mmPerUnit });
  for (const issue of rec.issues) diagnostics.push(diag(issue.code, issue.severity, issue.message));
  facts.push(...rec.facts);
  const ledger = ledgerOf(facts);

  const views = viewSet.views.map(v => ({
    name: v.name,
    bboxMm: [r2(v.bbox.x0), r2(v.bbox.y0), r2(v.bbox.x1 - v.bbox.x0), r2(v.bbox.y1 - v.bbox.y0)] as [number, number, number, number],
    identifiedBy: v.identifiedBy,
    ...(v.label ? { label: v.label } : {}),
  }));
  const sheetInfo: DrawingToCadResult['sheet'] = {
    widthMm: r2(vectors.widthMm),
    heightMm: r2(vectors.heightMm),
    scale: { text: scaleLabel(sheetPerModel), sheetPerModel: Math.round(sheetPerModel * 1e6) / 1e6, source: scaleSource },
    units,
    projection: angleName,
  };

  if (!rec.model) {
    return { ok: false, page, pageCount: vectors.pageCount, sheet: sheetInfo, views, params: [], ledger, diagnostics };
  }
  if (ledger.unresolvedCount > 0) {
    diagnostics.push(diag(
      'reference.assumptions.unresolved',
      'warn',
      `${ledger.unresolvedCount} ledger fact(s) are open (inferred, assumed, missing or disagreeing values) — confirm or override them with resolve_assumptions before relying on the rebuilt part.`,
    ));
  }

  const model = rec.model;
  const script = emitKcadScript(model, {
    source: input.source,
    page,
    views: viewNames,
    projection: viewSet.projection,
    scaleText: scaleLabel(sheetPerModel),
    units,
    ...(input.ledgerPath ? { ledgerPath: input.ledgerPath } : {}),
    unresolvedCount: ledger.unresolvedCount,
  });

  let fidelity: FidelityReport | undefined;
  if (input.verify !== false) {
    const { verifyReconstruction } = await import('./verify');
    try {
      fidelity = await verifyReconstruction(script, model, rec.geometry, rec.snap);
    } catch (e) {
      const reason = `verification threw: ${e instanceof Error ? e.message : String(e)}`;
      fidelity = {
        verdict: 'failed',
        extents: { x: { expected: model.extents.x, actual: 0, delta: model.extents.x }, y: { expected: model.extents.y, actual: 0, delta: model.extents.y }, z: { expected: model.extents.z, actual: 0, delta: model.extents.z } },
        holes: { expected: [], actual: [], maxDiameterDelta: 0 },
        silhouettes: [],
        reasons: [reason],
        error: reason,
      };
    }
  }

  return {
    ok: !diagnostics.some(d => d.severity === 'error') && fidelity?.verdict !== 'failed',
    page,
    pageCount: vectors.pageCount,
    sheet: sheetInfo,
    views,
    reconstruction: {
      kind: model.kind,
      profileView: model.profileView,
      axis: (model.kind === 'extrude' ? model.extrudeAxis : model.revolveAxis)!,
      holeCount: model.holes.length,
      extents: { x: r2(model.extents.x), y: r2(model.extents.y), z: r2(model.extents.z) },
    },
    params: model.params,
    script,
    ledger,
    ...(fidelity ? { fidelity } : {}),
    diagnostics,
  };
}
