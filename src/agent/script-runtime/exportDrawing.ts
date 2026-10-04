// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runScript } from '../../composition/runScript';
import { type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { renderSvgDrawing, type SvgDrawingOptions } from '../../kernel/backends/occt/exportSvgDrawing';
import { explodedPoses, applyExplodedOffsets, parseExplodeInput } from '../../modeling/runtime/explodedPoses';
import { computeBom } from './bom';
import type { Assembly } from '../../modeling/capture/assembly';
import type { DrawingDimensionSpec } from '../../shared/intent/drawingGdtRecord';
import type { DrawingAnnotation, DrawingAnchor } from '../../kernel/backends/occt/drawingAnnotations';
import { collectDrawingDeclarations } from '../../modeling/runtime/drawingDeclarations';
import { sceneToWorldFrameParts, type WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { looksLikeBuilding, renderArchitecturalPlan } from '../../kernel/backends/occt/drawingArchitectural';

import { svgSheetsToPdf } from '../../kernel/export/pdf/svgSheetToPdf';
import { KERNELCAD_NAME, attributionGenerator } from '../../shared/links/attribution';

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
  const architectural = pdf.style === 'architectural';
  const assemblies = run.session.assemblies as Map<string, Assembly>;
  const material = pdf.material ?? sharedAssemblyMaterial(firstAssemblyOrUndefined(assemblies));
  const svgOpts = pdfSheetOptions(pdf, material);
  const sheet = await renderDrawingSheet(svgOpts, fileName, lowered, targetId, run, diagnostics, featureCount);
  if (sheet.bytes.length === 0) return sheet;
  const svg = new TextDecoder().decode(sheet.bytes);
  const modelName = svgOpts.modelName ?? drawingModelName(fileName);
  const bytes = svgSheetsToPdf([svg], {
    title: pdf.title ?? modelName,
    subject: `${architectural ? 'Architectural floor plan' : 'Engineering drawing'}: ${pdf.partName ?? modelName}`,
    creator: `${KERNELCAD_NAME} pdf-drawing export`,
    producer: attributionGenerator(),
  });
  return { ...sheet, bytes };
}

/** Drop the keys whose value is undefined (exact optional properties). */
function definedOnly<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** The svg-drawing options that render a pdf-drawing sheet: standard sheet
 *  (default A3), full title block, today's date, autoAnnotate unless the
 *  author dimensions the sheet. */
function pdfSheetOptions(pdf: PdfDrawingOptions, material: string | undefined): SvgDrawingOptions {
  const authored = (pdf.annotations ?? []).length > 0;
  return {
    format: 'svg-drawing',
    sheet: pdf.sheet ?? 'a3',
    projection: pdf.projection ?? 'third',
    date: pdf.date ?? new Date().toISOString().slice(0, 10),
    titleBlock: definedOnly({ title: pdf.title, partName: pdf.partName, material, revision: pdf.revision }),
    ...definedOnly({
      modelName: pdf.modelName,
      annotations: pdf.annotations,
      sections: pdf.sections,
      exploded: pdf.exploded as SvgDrawingOptions['exploded'],
      balloons: pdf.balloons,
      partsList: pdf.partsList,
      style: pdf.style,
      plan: pdf.plan,
    }),
    autoAnnotate: pdf.autoAnnotate ?? !authored,
  };
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
  const styleError = drawingStyleError(opts.style);
  if (styleError !== undefined) return { bytes: new Uint8Array(), featureCount, diagnostics: [...diagnostics, styleError] };
  if (opts.style === 'architectural') {
    const plan = renderArchitecturalPlan(drawingParts, {
      ...definedOnly({
        sheet: opts.sheet,
        title: opts.titleBlock?.title,
        revision: opts.titleBlock?.revision,
        date: opts.date,
        plan: opts.plan,
      }),
      modelName,
    });
    return { bytes: plan.bytes, featureCount, diagnostics };
  }
  const styleHint = architecturalStyleHint(opts.style, drawingParts);
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
  const annotations = effectiveAnnotations(opts, captured);
  const rendered = renderSvgDrawing(drawingParts, {
    ...opts,
    ...(annotations !== undefined ? { annotations } : {}),
    modelName,
    declarations,
    ...(exploded.parts !== undefined ? { explodedParts: exploded.parts } : {}),
    ...(bom.rows !== undefined ? { bomRows: bom.rows } : {}),
  });
  return {
    bytes: rendered.bytes,
    featureCount,
    diagnostics: [
      ...diagnostics, ...exploded.diagnostics, ...bom.diagnostics, ...rendered.diagnostics,
      ...(styleHint === undefined ? [] : [styleHint]),
    ],
    ...(rendered.report === undefined ? {} : { drawingReport: rendered.report }),
  };
}

function drawingStyleError(style: unknown): CompilerDiagnostic | undefined {
  if (style === undefined || style === 'mechanical' || style === 'architectural') return undefined;
  return {
    target: 'export-occt',
    code: 'cli.invalid-args',
    severity: 'error',
    message: `drawing options.style must be 'mechanical' or 'architectural'; got ${JSON.stringify(style)}.`,
    hint: "Pass options.style: 'architectural' for a floor plan, or omit it for the mechanical part sheet.",
    nextAction: NEXT_ACTIONS['cli.invalid-args'],
  };
}

/** A building-sized model drawn with the default mechanical sheet gets part
 *  annotations (datums, flatness, ISO 2768) that mean nothing on a floor
 *  plan: suggest the architectural style. Explicit `'mechanical'` is quiet. */
function architecturalStyleHint(style: SvgDrawingOptions['style'], parts: readonly WorldFramePart[]): CompilerDiagnostic | undefined {
  if (style !== undefined) return undefined;
  const boxes = parts.map(p => p.shape.boundingBox());
  const bbox = {
    min: [0, 1, 2].map(k => Math.min(...boxes.map(b => b.min[k]))),
    max: [0, 1, 2].map(k => Math.max(...boxes.map(b => b.max[k]))),
  };
  if (!looksLikeBuilding(bbox)) return undefined;
  const size = [0, 1, 2].map(k => Math.round(bbox.max[k] - bbox.min[k])).join(' × ');
  return {
    target: 'export-occt',
    code: 'drawing.style.architectural-suggested',
    severity: 'warn',
    message: `The model is building-sized (${size} mm), but the sheet uses the mechanical part style (datums, flatness, ISO 2768).`,
    hint: HINT_TEMPLATES['drawing.style.architectural-suggested'].template,
    nextAction: NEXT_ACTIONS['drawing.style.architectural-suggested'],
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

/** Authored export-option annotations win; declared dimensions are not merged on top of them. */
function effectiveAnnotations(
  opts: SvgDrawingOptions,
  captured: ReturnType<typeof collectDrawingDeclarations>,
): SvgDrawingOptions['annotations'] {
  if ((opts.annotations ?? []).length > 0 || captured.dimensions.length === 0) return opts.annotations;
  return captured.dimensions.map(toDrawingAnnotation);
}

/** A `shape.dimension()` declaration as a drawing annotation (front view). */
export function toDrawingAnnotation(d: DrawingDimensionSpec): DrawingAnnotation {
  const text = d.label !== undefined ? { text: d.label } : {};
  if (d.kind === 'linear') return { kind: 'linear', from: d.from as DrawingAnchor, to: d.to as DrawingAnchor, ...text };
  if (d.kind === 'angular') return { kind: 'angular', from: d.from, to: d.to, ...text };
  return { kind: d.kind, edge: d.edge, ...text };
}

function mergeDrawingDeclarations(
  opts: SvgDrawingOptions,
  captured: ReturnType<typeof collectDrawingDeclarations>,
): ReturnType<typeof collectDrawingDeclarations> {
  return {
    datums: [...(opts.declarations?.datums ?? []), ...captured.datums],
    tolerances: [...(opts.declarations?.tolerances ?? []), ...captured.tolerances],
    dimensions: [...(opts.declarations?.dimensions ?? []), ...captured.dimensions],
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
