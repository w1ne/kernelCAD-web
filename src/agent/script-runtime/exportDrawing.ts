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

import type { ExportInput, ExportResult } from './export';

/** svg-drawing entry path: engineering-drawing sheet rendering, including
 *  exploded views, BOM balloons / parts-list and GD&T declarations. */
export async function exportSvgDrawing(
  input: ExportInput,
  fileName: string,
  lowered: ShapeBackend,
  targetId: string,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const opts =
    (input.options as SvgDrawingOptions | undefined) ??
    { format: 'svg-drawing' as const };
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
  const modelName =
    opts.modelName ?? baseName.replace(/(\.kcad)?\.ts$/, '');
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
