// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runScript } from '../../composition/runScript';
import { type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { renderSvgDrawing, type SvgDrawingOptions } from '../../kernel/backends/occt/exportSvgDrawing';
import { explodedPoses, applyExplodedOffsets, parseExplodeInput } from '../../modeling/runtime/explodedPoses';
import { computeBom } from './bom';
import type { Assembly } from '../../modeling/capture/assembly';
import { collectDrawingDeclarations } from '../../modeling/runtime/drawingDeclarations';
import { sceneToWorldFrameParts, type WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';

import { svgSheetsToPdf } from '../../kernel/export/pdf/svgSheetToPdf';

import type { ExportInput, ExportResult, PdfDrawingOptions } from './export';

type ScriptRun = Awaited<ReturnType<typeof runScript>>;

/** svg-drawing entry path: engineering-drawing sheet rendering, including
 *  exploded views, BOM balloons / parts-list and GD&T declarations. */
export async function exportSvgDrawing(
  input: ExportInput,
  fileName: string,
  lowered: ShapeBackend,
  targetId: string,
  run: ScriptRun,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const opts =
    (input.options as SvgDrawingOptions | undefined) ??
    { format: 'svg-drawing' as const };
  return renderDrawingSheet(opts, fileName, lowered, targetId, run, diagnostics, featureCount);
}

/**
 * pdf-drawing entry path: the same sheet the svg-drawing path renders — one
 * source of truth for views, dimensions and GD&T — on a standard sheet with
 * the full title block, transcribed into a vector PDF.
 */
export async function exportPdfDrawing(
  input: ExportInput,
  fileName: string,
  lowered: ShapeBackend,
  targetId: string,
  run: ScriptRun,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const pdf = (input.options as PdfDrawingOptions | undefined) ?? { format: 'pdf-drawing' as const };
  const assemblies = run.session.assemblies as Map<string, Assembly>;
  const material = pdf.material ?? sharedAssemblyMaterial(firstAssemblyOrUndefined(assemblies));
  const authored = (pdf.annotations ?? []).length > 0;
  const svgOpts: SvgDrawingOptions = {
    format: 'svg-drawing',
    sheet: pdf.sheet ?? 'a3',
    projection: pdf.projection ?? 'third',
    date: pdf.date ?? new Date().toISOString().slice(0, 10),
    titleBlock: {
      ...(pdf.title !== undefined ? { title: pdf.title } : {}),
      ...(pdf.partName !== undefined ? { partName: pdf.partName } : {}),
      ...(material !== undefined ? { material } : {}),
      ...(pdf.revision !== undefined ? { revision: pdf.revision } : {}),
    },
    ...(pdf.modelName !== undefined ? { modelName: pdf.modelName } : {}),
    ...(pdf.annotations !== undefined ? { annotations: pdf.annotations } : {}),
    ...(pdf.sections !== undefined ? { sections: pdf.sections } : {}),
    ...(pdf.exploded !== undefined ? { exploded: pdf.exploded as SvgDrawingOptions['exploded'] } : {}),
    ...(pdf.balloons !== undefined ? { balloons: pdf.balloons } : {}),
    ...(pdf.partsList !== undefined ? { partsList: pdf.partsList } : {}),
    autoAnnotate: pdf.autoAnnotate ?? !authored,
  };
  const sheet = await renderDrawingSheet(svgOpts, fileName, lowered, targetId, run, diagnostics, featureCount);
  if (sheet.bytes.length === 0) return sheet;
  const svg = new TextDecoder().decode(sheet.bytes);
  const modelName = svgOpts.modelName ?? drawingModelName(fileName);
  const bytes = svgSheetsToPdf([svg], {
    title: pdf.title ?? modelName,
    subject: `Engineering drawing: ${pdf.partName ?? modelName}`,
    creator: 'kernelCAD pdf-drawing export',
    producer: 'kernelCAD',
  });
  return { ...sheet, bytes };
}

/** Model name for the title block: the script file name without `.kcad.ts`. */
function drawingModelName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
  return baseName.replace(/(\.kcad)?\.ts$/, '');
}

/** The material every assembly part declares, when they all declare the same one. */
function sharedAssemblyMaterial(arm: Assembly | undefined): string | undefined {
  if (arm === undefined) return undefined;
  const names = new Set(arm.__parts().map(p => p.material));
  if (names.size !== 1) return undefined;
  const [only] = names;
  return only;
}

async function renderDrawingSheet(
  opts: SvgDrawingOptions,
  fileName: string,
  lowered: ShapeBackend,
  targetId: string,
  run: ScriptRun,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const modelName = opts.modelName ?? drawingModelName(fileName);
  const drawingParts = drawingPartsForBackend(lowered);
  const assemblies = run.session.assemblies as Map<string, Assembly>;
  const arm = firstAssemblyOrUndefined(assemblies);

  const exploded = await resolveExplodedParts(opts.exploded, lowered, arm, diagnostics, featureCount);
  if ('result' in exploded) return exploded.result;

  const bom = await resolveDrawingBom(
    opts.balloons === true || opts.partsList === true, arm, run,
  );
  if ('result' in bom) return bom.result;

  // GD&T declared on the feature graph (shape.datum / shape.tolerance) for
  // this target or anything feeding it.
  const captured = collectDrawingDeclarations(run.records, targetId);
  const declarations = mergeDrawingDeclarations(opts, captured);
  const rendered = renderSvgDrawing(drawingParts, {
    ...opts,
    modelName,
    declarations,
    ...(exploded.parts !== undefined ? { explodedParts: exploded.parts } : {}),
    ...(bom.rows !== undefined ? { bomRows: bom.rows } : {}),
  });
  return {
    bytes: rendered.bytes,
    featureCount,
    diagnostics: [...diagnostics, ...exploded.diagnostics, ...bom.diagnostics, ...rendered.diagnostics],
    ...(rendered.report === undefined ? {} : { drawingReport: rendered.report }),
  };
}

function drawingPartsForBackend(lowered: ShapeBackend): WorldFramePart[] {
  return isSceneBackend(lowered)
    ? sceneToWorldFrameParts(lowered)
    : [{ name: 'part', shape: lowered as OcctBackend }];
}

function firstAssemblyOrUndefined(assemblies: Map<string, Assembly>): Assembly | undefined {
  return assemblies.size > 0 ? assemblies.values().next().value as Assembly | undefined : undefined;
}

function mergeDrawingDeclarations(
  opts: SvgDrawingOptions,
  captured: ReturnType<typeof collectDrawingDeclarations>,
): ReturnType<typeof collectDrawingDeclarations> {
  return {
    datums: [...(opts.declarations?.datums ?? []), ...captured.datums],
    tolerances: [...(opts.declarations?.tolerances ?? []), ...captured.tolerances],
  };
}

/** Resolve `options.exploded` into world-frame exploded parts. Returns an
 *  error result when the input is malformed or there is no assembly, else the
 *  exploded parts (or `parts: undefined` when no explode was requested). */
export async function resolveExplodedParts(
  explodeRaw: { factor: number; mode?: 'radial' | 'mate-axis' } | undefined,
  lowered: ShapeBackend,
  arm: Assembly | undefined,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<
  | { result: ExportResult }
  | { parts: WorldFramePart[] | undefined; diagnostics: CompilerDiagnostic[] }
> {
  const drawingDiagnostics: CompilerDiagnostic[] = [];
  if (explodeRaw === undefined) return { parts: undefined, diagnostics: drawingDiagnostics };
  const parsed = parseExplodeInput({ factor: explodeRaw.factor, mode: explodeRaw.mode });
  if (!parsed.ok) {
    drawingDiagnostics.push({
      target: 'export-occt',
      code: 'cli.invalid-args',
      severity: 'error',
      message: `svg-drawing exploded: ${parsed.message}`,
      hint: "Pass options.exploded as { factor: number, mode?: 'radial'|'mate-axis' }.",
      nextAction: NEXT_ACTIONS['cli.invalid-args'],
    });
    return { result: { bytes: new Uint8Array(), featureCount, diagnostics: [...diagnostics, ...drawingDiagnostics] } };
  }
  if (!isSceneBackend(lowered) || arm === undefined) {
    drawingDiagnostics.push({
      target: 'export-occt',
      code: 'render.explode.no-assembly',
      severity: 'error',
      message: 'svg-drawing exploded view requires the script to return assembly.model() or assembly.solvedModel().',
      hint: 'Wrap the bodies in assembly().part(...) and return arm.model(), then re-export.',
      nextAction: NEXT_ACTIONS['render.explode.no-assembly'],
    });
    return { result: { bytes: new Uint8Array(), featureCount, diagnostics: [...diagnostics, ...drawingDiagnostics] } };
  }
  const poses = await explodedPoses(arm, parsed.value, lowered);
  return {
    parts: sceneToWorldFrameParts(applyExplodedOffsets(lowered, poses.offsets)),
    diagnostics: drawingDiagnostics,
  };
}

/** Resolve the parts-list / balloon BOM rows when requested. A missing
 *  assembly is a warning diagnostic (not a hard error). */
export async function resolveDrawingBom(
  wanted: boolean,
  arm: Assembly | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
): Promise<
  | { result: ExportResult }
  | { rows: import('../../kernel/backends/occt/drawingExplode').DrawingBomRow[] | undefined; diagnostics: CompilerDiagnostic[] }
> {
  if (!wanted) return { rows: undefined, diagnostics: [] };
  if (arm === undefined) {
    return {
      rows: undefined,
      diagnostics: [{
        target: 'export-occt',
        code: 'drawing.balloons.bom-unavailable',
        severity: 'warn',
        message: 'svg-drawing balloons/partsList requested but the script has no assembly to extract a BOM from.',
        hint: 'Return assembly.model() with named parts, or omit balloons/partsList.',
        nextAction: NEXT_ACTIONS['drawing.balloons.bom-unavailable'],
      }],
    };
  }
  const bom = await computeBom(arm, run.session);
  return { rows: bom.rows, diagnostics: bom.diagnostics };
}
