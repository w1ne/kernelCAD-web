// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/exportSvgDrawing.ts
//
// Engineering-drawing SVG exporter: a standard third-angle sheet with
// front / top / left orthographic views plus an isometric pictorial,
// rendered from OCCT hidden-line-removal projections.
//
// Sheet anatomy (all coordinates in millimetres, y down):
//   - frame border + title block (model name, scale, units, date,
//     third-angle projection symbol) anchored bottom-right.
//   - third-angle arrangement: top view above the front view (shared x
//     mapping), left view to the left of the front view (shared y mapping),
//     isometric in the upper-right cell. One drawing scale for all views,
//     snapped to the standard scale series.
//   - line styling per drafting convention: visible edges solid full-weight,
//     hidden edges dashed half-weight, tangent (smooth-transition) edges
//     thin solid. Hidden tangent edges are omitted — they carry no contour
//     information and only add noise.
//   - dimensions: by default the overall bounding box — width under the front
//     view, height right of the front view, depth left of the top view. Pass
//     `options.annotations` to dimension actual features instead (see
//     drawingAnnotations.ts); authored annotations REPLACE the bbox set, and
//     view captions move down to clear whatever stacks beneath them.
//
// Coincident projected segments (e.g. a through-bore's front and back rims
// landing on the same 2D arc) are deduplicated visible-first, so a segment
// never renders twice and never renders dashed underneath a solid copy.

import { validateDrawingReviewOptions } from '../../../shared/intent/drawingReview';
import type { DrawingReviewOptions } from '../../../shared/intent/drawingReview';
import type { AnyShape } from 'replicad';
import type { WorldFramePart } from './sceneToWorldFrame';
import type { ArchitecturalPlanOptions } from './drawingArchitectural';
import { DRAWING_VIEW_NAMES as VIEW_NAMES, selectedDrawingLayout, validateDrawingViewSelection } from './drawingViewSelection';
import { OcctBackend } from './occtBackend';
import {
  makeDrawingCamera,
  prepareShapeForDrawing,
  projectShapeForDrawing,
} from './drawingProjection';
import {
  SHEET_SERIES,
  dedupPolylineClasses,
  shiftOrthographicViews,
  dimensionToSvg,
  formatDimValue,
  viewBoxOfPolylines,
  type DrawingSheetSize,
  type DrawingViewName,
  type LinearDimension,
  type Polyline2,
  type ProjectionAngle,
  type SheetLayout,
  type SheetSpec,
  type ViewBox2,
  type ViewPlacement,
} from './drawingLayout';
import {
  renderAnnotations,
  DIM_BASE,
  escAttr,
  type DrawingAnnotation,
} from './drawingAnnotations';
import { renderSections, type DrawingSectionSpec } from './drawingSections';
import {
  balloonAndTraceSvg,
  partsListSvg,
  explodeLabelOverlaps,
  type DrawingBomRow,
} from './drawingExplode';
import {
  renderAutoDrawing,
  type AutoAnnotateOptions,
  type DrawingReport,
  type DrawingReportAnnotation,
} from './drawingAuto';
import { attributionGenerator } from '../../../shared/links/attribution';
import { generalToleranceCell, sheetTitleBlock } from './drawingTitleBlock';
import { reviewDrawingTextSvg } from '../../export/pdf/drawingTextReview';
import { renderViewGroups } from './drawingViewSvg';
import { reviewSheetViewPlacement } from './drawingSheetPreflight';
import { gridShift, resolveSheet, SECTION_BAND_H } from './drawingSheetSizing';
import { resolveDrawingBodies } from './drawingBodies';
import { finalizeDrawingReview } from './drawingReportReview';
import type { Box } from './drawingObstacles';
import type { DrawingDeclarations } from '../../../shared/intent/drawingGdtRecord';
import type { DraftingProfile, DraftingProfileId, DrawingAnnotationOverride } from '../../../shared/intent/drafting';
import { applyDraftingProfile, authoredAnnotationIds, invalidReview } from './draftingReview';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export type { DrawingBomRow } from './drawingExplode';
export type { DrawingAnnotation, DrawingAnchor } from './drawingAnnotations';
export type { DrawingSectionSpec, SectionPlane } from './drawingSections';
export type {
  AutoAnnotateKind,
  AutoAnnotateOptions,
  DrawingReport,
  DrawingReportAnnotation,
  Iso2768Class,
} from './drawingAuto';

export type { DrawingSheetSize, ProjectionAngle } from './drawingLayout';

/**
 * Full title-block fields. Supplying this object (even empty) switches the
 * sheet from the compact NAME / SCALE / UNITS / DATE block to the full
 * 180 mm block: TITLE, projection symbol, PART NAME, MATERIAL, REV, SCALE,
 * UNITS, SHEET size and DATE. Unset text fields print `—`.
 */
export interface DrawingTitleBlock {
  /** Drawing title; defaults to the model name. */
  title?: string;
  /** Part name / number; defaults to the model name. */
  partName?: string;
  material?: string;
  revision?: string;
}

export interface SvgDrawingOptions extends DrawingReviewOptions {
  format: 'svg-drawing';
  /** Single front elevation, or the complete default four-view sheet. */
  views?: readonly DrawingViewName[];
  /** Runtime preview uses the printable PDF sheet/title/material defaults. */
  pdfSheet?: boolean;
  draftingProfile?: DraftingProfileId | DraftingProfile;
  annotationOverrides?: Readonly<Record<string, DrawingAnnotationOverride>>;
  /** Sheet size, always landscape; default `a4` (297×210 mm). `'auto'` /
   *  `'auto-ansi'` pick the smallest ISO / ANSI sheet that holds the views at
   *  1:1 or larger, else the largest sheet of the series. */
  sheet?: DrawingSheetSize | 'auto' | 'auto-ansi';
  /** Try at most two larger standard sheets when measured annotation/view
   *  placement improves. For explicit sheet sizes this is opt-in; auto/auto-ansi
   *  always allow bounded growth. Never changes 3D source geometry. */
  layoutRepair?: boolean;
  /** View arrangement and title-block symbol; default `'third'`. */
  projection?: ProjectionAngle;
  /** Full title block; see `DrawingTitleBlock`. */
  titleBlock?: DrawingTitleBlock;
  /** Model name shown in the title block. */
  modelName?: string;
  /** Title-block date text. Defaults to a blank placeholder so the output
   *  stays byte-deterministic; pass an ISO date to stamp it. */
  date?: string;
  /**
   * Authored dimensions and notes. When absent (or empty) the sheet falls back
   * to the automatic overall bounding-box dimensions, so existing drawings are
   * unchanged. When present they REPLACE the bbox dimensions — a sheet that
   * carried both would double-dimension the outline, which is a drafting
   * error, and the author has already said what they want measured.
   *
   * Unresolvable annotations throw rather than silently vanishing.
   */
  annotations?: readonly DrawingAnnotation[];
  /** Dimensions placed from the sheet. Merged after authored or declared
   *  annotations by the export entry; the renderer just draws `annotations`. */
  placedAnnotations?: readonly DrawingAnnotation[];
  /**
   * Section views: a real half-space cut through the assembled body,
   * projected through the axis's own camera, with the true cut cross-
   * section hatched at 45°. A cutting-plane indicator (dashed line, arrows,
   * letter) is drawn on the view where the plane appears edge-on, and the
   * section cell is added below the standard 4-view grid (the sheet grows
   * taller to make room — the standard views are unaffected).
   *
   * Any plane: `'xy'|'xz'|'yz'`, or `{ origin, normal }` with any non-zero
   * normal. Oblique normals get an auxiliary (true-shape) section cell and a
   * trace indicator on the standard view closest to edge-on. A plane that
   * misses the body's bounding box fails with
   * `drawing.section.plane-misses-body`.
   */
  sections?: readonly DrawingSectionSpec[];
  /**
   * Derive dimensions and GD&T from the B-rep: datums A/B/C, grouped hole
   * callouts with position frames, hole positions from the datums, overall
   * dimensions, grouped fillet / chamfer callouts, flatness on A, and an
   * ISO 2768 general-tolerance cell. See `drawingAuto.ts` for the rules.
   * Replaces the bounding-box dimensions (it carries its own overall set).
   */
  autoAnnotate?: boolean | AutoAnnotateOptions;
  /**
   * Datum / tolerance declarations captured from `shape.datum()` /
   * `shape.tolerance()`. Supplied by the script runtime; they are drawn with
   * or without `autoAnnotate` and never suppress the bounding-box dimensions.
   */
  declarations?: DrawingDeclarations;
  /** Exploded isometric: factor/mode are applied by the caller; the iso
   *  cell is drawn from `explodedParts` when provided. */
  exploded?: { factor: number; mode: 'radial' | 'mate-axis' };
  /** World-frame parts in the exploded pose, used only for the iso cell. */
  explodedParts?: readonly WorldFramePart[];
  /** Item balloons with leaders on the isometric cell. */
  balloons?: boolean;
  /** Parts-list table (item, name, qty, material) above the title block. */
  partsList?: boolean;
  /** BOM rows feeding balloons and the parts-list table. */
  bomRows?: readonly DrawingBomRow[];
  /** `'mechanical'` (default): the 4-view part sheet. `'architectural'`: a
   *  floor plan — see `drawingArchitectural.ts`; the mechanical-only keys
   *  (annotations, sections, autoAnnotate, exploded, balloons, partsList)
   *  do not apply to it. */
  style?: 'mechanical' | 'architectural';
  /** Floor-plan options for `style: 'architectural'`. */
  plan?: ArchitecturalPlanOptions;
}

export interface SvgDrawingResult {
  bytes: Uint8Array;
  /** Non-fatal diagnostics (overlap, datum ambiguity, unclassified holes). */
  diagnostics: CompilerDiagnostic[];
  /** Placement report; present whenever annotations were rendered. */
  report?: DrawingReport;
}

/** One projected view, classified by line role, in the view's model-2D frame (y up). */
export interface StyledDrawingView {
  visible: Polyline2[];
  tangent: Polyline2[];
  hidden: Polyline2[];
  box: ViewBox2;
}

type StyledView = StyledDrawingView;


/** Height of the band reserved below the standard view grid for sections. */


const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Classify and dedup one projected view. Class order is the dedup priority:
 * visible full-weight first, then tangent, then hidden — a coincident segment
 * lands once, in its strongest role.
 */
function styleProjectedView(raw: ReturnType<typeof projectShapeForDrawing>): StyledView {
  const [vSharp, vOutline, vSmooth, hSharp, hOutline] = dedupPolylineClasses([
    raw.visibleSharp,
    raw.visibleOutline,
    raw.visibleSmooth,
    raw.hiddenSharp,
    raw.hiddenOutline,
    // hiddenSmooth deliberately dropped — tangent hidden lines are noise.
  ]);
  const view: StyledView = {
    visible: [...vSharp, ...vOutline],
    tangent: vSmooth,
    hidden: [...hSharp, ...hOutline],
    box: { x: 0, y: 0, w: 1, h: 1 },
  };
  const box = viewBoxOfPolylines([view.visible, view.tangent, view.hidden]);
  if (box) view.box = box;
  return view;
}

function warnAboutSheetPlacement(
  sheetPlacement: ReturnType<typeof reviewSheetViewPlacement>,
  diagnosticsOut: CompilerDiagnostic[],
): void {
  if (sheetPlacement.issues.length) {
    const summary = sheetPlacement.issues.map(issue => `${issue.kind} (${issue.views.join('/')})`).join(', ');
    diagnosticsOut.push({
      target: 'export-occt', code: 'drawing.view.placement', severity: 'warn',
      message: `svg-drawing: projected view placement has ${sheetPlacement.issues.length} geometric issue(s): ${summary}.`,
      hint: 'Increase options.sheet (or use auto), then re-export and inspect the sheet. Check projected view placement and title-block clearance.',
      nextAction: NEXT_ACTIONS['drawing.view.placement'],
      details: { issueCount: sheetPlacement.issues.length },
    });
  }
}

/**
 * Project, classify and dedup the sheet's standard views — exactly the view
 * stage `exportSvgDrawing` draws. Class order is the dedup priority: visible
 * full-weight first, then tangent, then hidden — a coincident segment lands
 * once, in its strongest role. Exported so a reader of drawings (the
 * drawing-to-CAD fidelity check) can re-project a model through the same
 * cameras and line classes the exporter uses.
 */
export function projectDrawingViews(
  shape: AnyShape,
  names: readonly DrawingViewName[] = VIEW_NAMES,
): Record<DrawingViewName, StyledDrawingView> {
  const styled = {} as Record<DrawingViewName, StyledView>;
  const source = prepareShapeForDrawing(shape);
  try {
    for (const name of names) {
      const camera = makeDrawingCamera(name);
      const raw = source.project(camera, {
        withHidden: name !== 'iso',
      });
      styled[name] = styleProjectedView(raw);
    }
  } finally {
    source.dispose();
  }
  return styled;
}

/**
 * Render `parts` (one entry for a single body; one per assembly part in
 * world frame for a Scene) as a third-angle engineering-drawing sheet.
 * Multi-part inputs are compounded so the hidden-line pass sees inter-part
 * occlusion. Returns UTF-8 SVG bytes.
 */
export function exportSvgDrawing(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
  /** Optional sink for non-fatal (warn-severity) diagnostics. Mutated in
   *  place rather than returned so the primary Uint8Array return stays
   *  unchanged for every existing caller. */
  diagnosticsOut?: CompilerDiagnostic[],
): Uint8Array {
  const r = renderSvgDrawing(parts, options);
  if (diagnosticsOut !== undefined) diagnosticsOut.push(...r.diagnostics);
  return r.bytes;
}

interface DrawingStageInput {
  parts: WorldFramePart[];
  options: SvgDrawingOptions;
  dims: { w: number; d: number; h: number };
  sectionSpecs: readonly DrawingSectionSpec[];
  shape: AnyShape;
  styled: Record<DrawingViewName, StyledView>;
  viewBoxes: Record<DrawingViewName, ViewBox2>;
  projection: ProjectionAngle;
  frontOnly: boolean;
  explodedShape: AnyShape | undefined;
  assembledCentroids: Map<string, [number, number, number]>;
  explodedCentroids: Map<string, [number, number, number]>;
  explodedParts: readonly WorldFramePart[] | undefined;
}

type DrawingPagePass = {
  layout: SheetLayout;
  sectionStage: ReturnType<typeof renderSheetSections>;
  autoStage: ReturnType<typeof renderAutoStage>;
  diagnostics: CompilerDiagnostic[];
};

interface DrawingPageCandidate {
  sheet: SheetSpec;
  page: SheetSpec;
  sheetSize: DrawingSheetSize;
  s: number;
  pass: DrawingPagePass;
  score: { issueCount: number; overlapped: number; textIssueCount: number; total: number };
}

function scoreDrawingPage(ctx: DrawingStageInput, candidate: Omit<DrawingPageCandidate, 'score'>, checkText: boolean) {
  const { pass, page, s, sheetSize } = candidate;
  const { options, frontOnly, styled, explodedShape, assembledCentroids, explodedCentroids,
    explodedParts, projection } = ctx;
  const placement = reviewSheetViewPlacement(pass.layout, page,
    frontOnly ? ['front'] : VIEW_NAMES, pass.autoStage.generalTolerance !== undefined);
  let textIssueCount = 0;
  if (checkText) {
    const diagnostics: CompilerDiagnostic[] = [];
    const preview = buildSheetSvg({
      effSheet: page, usesHatchPattern: pass.sectionStage.usesHatchPattern,
      viewGroups: renderViewGroups(styled, pass.layout, pass.autoStage.bottomReserve, s,
        explodedShape !== undefined, frontOnly ? ['front'] : VIEW_NAMES),
      dimBodies: pass.autoStage.dimBodies, sectionsSvg: pass.sectionStage.svg,
      explodeSvg: renderExplodeOverlays({
        options, assembledCentroids, explodedCentroids, explodedParts,
        layout: pass.layout, s, effSheet: page, diagnosticsOut: diagnostics,
      }),
      generalTolerance: pass.autoStage.generalTolerance,
      layout: pass.layout, options, explodedShape, diagnosticsOut: diagnostics,
      report: undefined, sheetSize, projection,
    });
    textIssueCount = reviewDrawingTextSvg(new TextDecoder().decode(preview.bytes), {
      w: page.w, h: page.h, margin: page.margin, titleBlock: page.titleBlock,
      generalTolerance: pass.autoStage.generalTolerance !== undefined,
    }).issues.length;
  }
  const issueCount = placement.issues.length;
  const overlapped = pass.autoStage.report?.overlapped ?? 0;
  return { issueCount, overlapped, textIssueCount,
    total: issueCount * 1000 + overlapped * 100 + textIssueCount };
}

function computeDrawingPage(ctx: DrawingStageInput,
  size: SvgDrawingOptions['sheet'], checkText: boolean): DrawingPageCandidate {
  const { parts, options, dims, sectionSpecs, shape, styled, viewBoxes, projection, frontOnly } = ctx;
  const hasSections = sectionSpecs.length > 0;
  const { sheet, page, size: sheetSize } = resolveSheet({ ...options, sheet: size }, viewBoxes, projection, hasSections);
  const gridLayout = selectedDrawingLayout(frontOnly, viewBoxes, sheet, projection);
  const s = gridLayout.scale;
  const annotate = (layout: SheetLayout): DrawingPagePass => {
    const diagnostics: CompilerDiagnostic[] = [];
    const dimensionStage = renderDimensionStage(parts, options, layout, s, dims, diagnostics);
    const sectionStage = renderSheetSections(shape, sectionSpecs, sheet, layout, s);
    const autoStage = renderAutoStage({
      parts, options, shape, layout, styled, s, sheet,
      sectionsSvg: sectionStage.svg, dimBodies: dimensionStage.dimBodies,
      bottomReserve: dimensionStage.bottomReserve, rightReserve: dimensionStage.rightReserve,
      report: dimensionStage.report, diagnosticsOut: diagnostics,
    });
    return { layout, sectionStage, autoStage, diagnostics };
  };
  let pass = annotate(gridLayout);
  const crowded = pass.autoStage.report?.overlapped ?? 0;
  const dy = crowded > 0 ? gridShift(sheet, gridLayout, pass.autoStage.labelBoxes) : 0;
  if (dy !== 0) {
    const moved = annotate(shiftOrthographicViews(gridLayout, dy));
    if ((moved.autoStage.report?.overlapped ?? 0) < crowded) pass = moved;
  }
  const candidate = { sheet, page, sheetSize, s, pass };
  return { ...candidate, score: scoreDrawingPage(ctx, candidate, checkText) };
}

function selectDrawingPage(ctx: DrawingStageInput) {
  const { options } = ctx;
  const repairEnabled = options.layoutRepair === true ||
    (options.layoutRepair !== false && (options.sheet === 'auto' || options.sheet === 'auto-ansi'));
  let selected = computeDrawingPage(ctx, options.sheet, repairEnabled);
  const initialSize = selected.sheetSize;
  const summary = (c: DrawingPageCandidate) => ({
    sheet: c.sheetSize, issueCount: c.score.issueCount,
    overlapped: c.score.overlapped, textIssueCount: c.score.textIssueCount,
  });
  const attempts = [summary(selected)];
  if (repairEnabled && selected.score.total > 0) {
    const series = SHEET_SERIES[selected.sheetSize.startsWith('ansi-') ? 'ansi' : 'iso'];
    for (const size of series.slice(series.indexOf(selected.sheetSize) + 1,
      series.indexOf(selected.sheetSize) + 3)) {
      const next = computeDrawingPage(ctx, size, true);
      attempts.push(summary(next));
      if (next.score.total >= selected.score.total) break;
      selected = next;
      if (selected.score.total === 0) break;
    }
  }
  return { ...selected, repairEnabled, initialSize, attempts };
}

/** Same sheet as `exportSvgDrawing`, returning diagnostics and the placement
 *  report alongside the bytes. */
export function renderSvgDrawing(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
): SvgDrawingResult {
  options = applyDraftingProfile(options);
  const frontOnly = validateDrawingViewSelection(options);
  const reviewPlans = validateDrawingReviewOptions(options, options.declarations?.reviewPlans);
  options = { ...options, reviewPlans };
  const diagnosticsOut: CompilerDiagnostic[] = [];
  if (parts.length === 0) {
    throw new Error('svg-drawing export requires at least one part.');
  }
  const { explodedParts, assembledCentroids, explodedCentroids, shape, explodedShape } =
    resolveDrawingBodies(parts, options);

  const [bbMin, bbMax] = shape.boundingBox.bounds;
  const dims = {
    w: bbMax[0] - bbMin[0],
    d: bbMax[1] - bbMin[1],
    h: bbMax[2] - bbMin[2],
  };

  const styled = projectSheetViews(shape, explodedShape);
  const viewBoxes = {
    front: styled.front.box,
    top: styled.top.box,
    left: styled.left.box,
    iso: styled.iso.box,
  };
  const projection = options.projection ?? 'third';
  const selection = selectDrawingPage({
    parts, options, dims, sectionSpecs: options.sections ?? [], shape, styled, viewBoxes,
    projection, frontOnly, explodedShape, assembledCentroids, explodedCentroids, explodedParts,
  });
  const { pass, page, sheetSize, s, repairEnabled, initialSize, attempts } = selection;
  const resultScore = selection.score;
  diagnosticsOut.push(...pass.diagnostics);
  const { layout } = pass;
  const effSheet: SheetSpec = page;
  const sectionsSvg = pass.sectionStage.svg;
  const usesHatchPattern = pass.sectionStage.usesHatchPattern;
  const dimBodies = pass.autoStage.dimBodies;
  const bottomReserve = pass.autoStage.bottomReserve;
  const generalTolerance = pass.autoStage.generalTolerance;
  const visibleViews = frontOnly ? (['front'] as const) : VIEW_NAMES;
  const sheetPlacement = reviewSheetViewPlacement(layout, effSheet, visibleViews, generalTolerance !== undefined);
  warnAboutSheetPlacement(sheetPlacement, diagnosticsOut);
  const report = pass.autoStage.report ?? { placed: 0, overlapped: 0, byKind: {}, datums: [], annotations: [] };
  report.sheetPlacement = sheetPlacement;
  if (repairEnabled) report.sheetRepair = { applied: initialSize !== sheetSize, attempts,
    status: resultScore.total === 0 ? 'clear' : 'issues' };
  finalizeDrawingReview(report, options, diagnosticsOut);

  const viewGroups = renderViewGroups(styled, layout, bottomReserve, s, explodedShape !== undefined, visibleViews);

  const explodeSvg = renderExplodeOverlays({
    options,
    assembledCentroids,
    explodedCentroids,
    explodedParts,
    layout,
    s,
    effSheet,
    diagnosticsOut,
  });

  const rendered = buildSheetSvg({
    effSheet,
    usesHatchPattern,
    viewGroups,
    dimBodies,
    sectionsSvg,
    explodeSvg,
    generalTolerance,
    layout,
    options,
    explodedShape,
    diagnosticsOut,
    report,
    sheetSize,
    projection,
  });
  // Inspect the actual serialized SVG sheet using the same XML/Helvetica
  // text geometry as the SVG-to-vector-PDF path, not an unrendered model.
  const renderedText = reviewDrawingTextSvg(new TextDecoder().decode(rendered.bytes), {
    w: effSheet.w, h: effSheet.h, margin: effSheet.margin,
    titleBlock: effSheet.titleBlock, generalTolerance: generalTolerance !== undefined,
  });
  report.renderedText = renderedText;
  if (renderedText.issues.length) {
    const kinds = [...new Set(renderedText.issues.map(i => i.kind))].join(', ');
    diagnosticsOut.push({
      target: 'export-occt', code: 'drawing.text.placement', severity: 'warn',
      message: `svg-drawing: ${renderedText.issues.length} serialized-sheet text placement issue(s): ${kinds}.`,
      hint: 'Inspect the exported SVG/PDF, move authored annotation offsets or increase the sheet size, then re-export. Review the specific renderedText issues.',
      nextAction: NEXT_ACTIONS['drawing.text.placement'],
      details: { issueCount: renderedText.issues.length, checkedText: renderedText.checkedText },
    });
  }
  return rendered;
}

/**
 * Project, classify and dedup the sheet's standard views, swapping in the
 * exploded pose for the isometric cell when one is supplied. Class order is
 * the dedup priority: visible full-weight first, then tangent, then hidden —
 * a coincident segment lands once, in its strongest role.
 */
function projectSheetViews(
  shape: AnyShape,
  explodedShape: AnyShape | undefined,
): Record<DrawingViewName, StyledView> {
  const styled = {} as Record<DrawingViewName, StyledView>;
  // One preparation serves every view of the assembled shape.
  const assembled = prepareShapeForDrawing(shape);
  try {
    for (const name of VIEW_NAMES) {
      const camera = makeDrawingCamera(name);
      const options = { withHidden: name !== 'iso' };
      const raw = name === 'iso' && explodedShape !== undefined
        ? projectShapeForDrawing(explodedShape, camera, options)
        : assembled.project(camera, options);
      styled[name] = styleProjectedView(raw);
    }
  } finally {
    assembled.dispose();
  }
  return styled;
}

/**
 * Dimension phase: authored dimensions if the caller supplied any, else the
 * automatic bounding-box set, or nothing when auto-annotation draws its own.
 * Computed before the view groups because bottom-stacked dimensions decide
 * how far down each view's caption has to move to clear them.
 */
function renderDimensionStage(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
  layout: SheetLayout,
  s: number,
  dims: { w: number; d: number; h: number },
  diagnosticsOut: CompilerDiagnostic[],
): {
  dimBodies: string[];
  bottomReserve: Record<DrawingViewName, number>;
  rightReserve: Record<DrawingViewName, number>;
  report: DrawingReport | undefined;
} {
  if (options.annotations?.length) return renderAuthoredDimensionStage(parts, options, layout, s, diagnosticsOut);
  const autoOn = options.autoAnnotate !== undefined && options.autoAnnotate !== false;
  const f = layout.views.front.box;
  const t = layout.views.top.box;
  let dimBodies: string[];
  let bottomReserve: Record<DrawingViewName, number>;
  const rightReserve: Record<DrawingViewName, number> = { front: 0, top: 0, left: 0, iso: 0 };
  let report: DrawingReport | undefined;

  if (autoOn) {
    dimBodies = [];
    bottomReserve = { front: 0, top: 0, left: 0, iso: 0 };
  } else if (options.projection === 'first') {
    // First-angle grid: the front view's free sides are above and left, the
    // top view's free vertical side is its right (see computeSheetLayout).
    const firstAngleDims: LinearDimension[] = [
      { kind: 'horizontal', from: [f.x, f.y], to: [f.x + f.w, f.y], linePos: f.y - DIM_BASE, label: formatDimValue(dims.w) },
      { kind: 'vertical', from: [f.x, f.y], to: [f.x, f.y + f.h], linePos: f.x - DIM_BASE, label: formatDimValue(dims.h) },
      { kind: 'vertical', from: [t.x + t.w, t.y], to: [t.x + t.w, t.y + t.h], linePos: t.x + t.w + DIM_BASE, label: formatDimValue(dims.d) },
    ];
    dimBodies = (options.views?.length === 1 ? firstAngleDims.slice(0, 2) : firstAngleDims).map(d => dimensionToSvg(d));
    bottomReserve = { front: 0, top: 0, left: 0, iso: 0 };
  } else {
    const dimSpecs: LinearDimension[] = [
      {
        kind: 'horizontal',
        from: [f.x, f.y + f.h],
        to: [f.x + f.w, f.y + f.h],
        linePos: f.y + f.h + DIM_BASE,
        label: formatDimValue(dims.w),
      },
      {
        kind: 'vertical',
        from: [f.x + f.w, f.y],
        to: [f.x + f.w, f.y + f.h],
        linePos: f.x + f.w + DIM_BASE,
        label: formatDimValue(dims.h),
      },
      {
        kind: 'vertical',
        from: [t.x, t.y],
        to: [t.x, t.y + t.h],
        linePos: t.x - DIM_BASE,
        label: formatDimValue(dims.d),
      },
    ];
    dimBodies = (options.views?.length === 1 ? dimSpecs.slice(0, 2) : dimSpecs).map(d => dimensionToSvg(d));
    // Only the front view carries a bottom-stacked (width) dimension.
    bottomReserve = { front: DIM_BASE, top: 0, left: 0, iso: 0 };
  }

  return { dimBodies, bottomReserve, rightReserve, report };
}

interface AuthoredReportContext {
  parts: WorldFramePart[];
  options: SvgDrawingOptions;
  layout: SheetLayout;
  scale: number;
  original: readonly DrawingAnnotation[];
  ids: string[];
  authored: DrawingAnnotation[];
  visible: { a: DrawingAnnotation; i: number }[];
  labels: Map<number, string>;
  crowded: Set<number>;
}

function reviewedAuthoredAnnotation(a: DrawingAnnotation, id: string, options: SvgDrawingOptions): DrawingAnnotation {
  const o = options.annotationOverrides?.[id];
  if (o?.text !== undefined && (a.kind === 'datum' || a.kind === 'fcf')) invalidReview(`annotation ${id} has no primary label; edit its datum or tolerance declaration`);
  return { ...a, ...(o?.text !== undefined ? { text: o.text } : {}), ...(o?.view !== undefined ? { view: o.view } : {}),
    ...(o?.offset !== undefined ? { offset: (a.offset ?? 0) + o.offset } : {}) } as DrawingAnnotation;
}

function renderAuthoredDimensionStage(parts: WorldFramePart[], options: SvgDrawingOptions, layout: SheetLayout, s: number, diagnosticsOut: CompilerDiagnostic[]) {
  const original = options.annotations ?? [];
  const ids = authoredAnnotationIds(original);
  const authored = original.map((a, i) => reviewedAuthoredAnnotation(a, ids[i], options));
  if (options.views && authored.some(a => !options.views!.includes(a.view ?? 'front'))) {
    throw new Error('An authored annotation override targets a hidden view; use the front view for a front-only drawing.');
  }
  const visible = authored.flatMap((a, i) => options.annotationOverrides?.[ids[i]]?.suppress ? [] : [{ a, i }]);
  const rendered = renderAnnotations({ parts, annotations: visible.map(({ a }) => a),
    reviewedViewIds: new Map(visible.flatMap(({ i }, index) =>
      options.annotationOverrides?.[ids[i]]?.view !== undefined ? [[index, { id: ids[i], originalView: original[i].view ?? 'front' }] as const] : [])),
    reviewedTextIds: new Set(visible.flatMap(({ i }, index) => options.annotationOverrides?.[ids[i]]?.text !== undefined ? [index] : [])),
    placements: layout.views, scale: s });
  const ctx: AuthoredReportContext = { parts, options, layout, scale: s, original, ids, authored, visible,
    crowded: new Set(rendered.overlaps.flat().map(i => visible[i].i)),
    labels: new Map(visible.map(({ i }, index) => [i, drawingAnnotationText(rendered.svg[index])])) };
  const dimBodies = rendered.svg.map((svg, i) => svg.replace(/^(<g\b[^>]*)(>)/, `$1 data-kc-annotation-id="${escAttr(ids[visible[i].i])}"$2`));
  const report: DrawingReport = { placed: visible.length - ctx.crowded.size, overlapped: ctx.crowded.size,
    byKind: visible.reduce<Record<string, number>>((acc, { a }) => { acc[a.kind] = (acc[a.kind] ?? 0) + 1; return acc; }, {}),
    datums: [], annotations: authored.map((a, i) => authoredReportRow(ctx, a, i)) };
  reportAuthoredOverlaps(rendered.overlaps, diagnosticsOut);
  return { dimBodies, bottomReserve: rendered.bottomReserve, rightReserve: rendered.rightReserve, report };
}

function authoredPrimaryLabel(ctx: AuthoredReportContext, i: number): string {
  const a = ctx.authored[i];
  if ('text' in a && a.text !== undefined) return a.text;
  // Measure without the suffix so editing cannot duplicate the tolerance.
  return drawingAnnotationText(renderAnnotations({ parts: ctx.parts, annotations: [{ ...a, tol: undefined } as DrawingAnnotation], placements: ctx.layout.views, scale: ctx.scale }).svg[0]);
}

function authoredMeasuredTextOverride(a: DrawingAnnotation): boolean {
  return ['linear', 'diameter', 'radius', 'angular'].includes(a.kind) && 'text' in a && a.text !== undefined;
}

function authoredOriginalLabel(ctx: AuthoredReportContext, i: number): string {
  const a = ctx.original[i];
  if (authoredMeasuredTextOverride(a)) return drawingAnnotationText(renderAnnotations({ parts: ctx.parts,
    annotations: [{ ...a, text: undefined } as DrawingAnnotation], placements: ctx.layout.views, scale: ctx.scale }).svg[0]);
  if ('text' in a && a.text !== undefined) return a.text;
  if (!ctx.options.annotationOverrides?.[ctx.ids[i]]?.text && !ctx.options.annotationOverrides?.[ctx.ids[i]]?.suppress) return ctx.labels.get(i) ?? a.kind;
  return drawingAnnotationText(renderAnnotations({ parts: ctx.parts, annotations: [a], placements: ctx.layout.views, scale: ctx.scale }).svg[0]);
}

function authoredReportOverrideFields(ctx: AuthoredReportContext, i: number) {
  const o = ctx.options.annotationOverrides?.[ctx.ids[i]];
  return { ...(o?.suppress ? { suppressed: true } : {}),
    ...(o?.text !== undefined || authoredMeasuredTextOverride(ctx.original[i]) ? { originalText: authoredOriginalLabel(ctx, i) } : {}),
    ...(o?.offset !== undefined ? { offset: o.offset } : {}) };
}

function authoredReportRow(ctx: AuthoredReportContext, a: DrawingAnnotation, i: number): DrawingReportAnnotation {
  return { id: ctx.ids[i], source: 'authored', kind: a.kind, view: a.view ?? 'front',
    text: ctx.labels.get(i) ?? ('text' in a && a.text !== undefined ? a.text : authoredOriginalLabel(ctx, i)),
    ...(a.kind === 'linear' && a.tol !== undefined ? { primaryText: authoredPrimaryLabel(ctx, i) } : {}),
    overlapped: ctx.crowded.has(i), ...authoredReportOverrideFields(ctx, i) };
}

function reportAuthoredOverlaps(overlaps: readonly (readonly [number, number])[], diagnosticsOut: CompilerDiagnostic[]): void {
  if (!overlaps.length) return;
  const pairs = overlaps.map(([i, j]) => `annotations[${i}] / annotations[${j}]`).join(', ');
  diagnosticsOut.push({ target: 'export-occt', code: 'drawing.annotation.overlap', severity: 'warn',
    message: `svg-drawing: ${overlaps.length} annotation pair(s) have overlapping rendered labels: ${pairs}.`,
    hint: 'Reorder the annotations array, pass a different `view`, or add `offset` to push one of them further out.',
    nextAction: NEXT_ACTIONS['drawing.annotation.overlap'] });
}

function drawingAnnotationText(svg: string): string {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(m =>
    m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')).join(' | ');
}

/**
 * Section phase: render the requested section views into the reserved band
 * below the standard grid, against the ORIGINAL sheet spec. Returns an empty
 * stage when no sections were requested.
 */
function renderSheetSections(
  shape: AnyShape,
  sectionSpecs: readonly DrawingSectionSpec[],
  sheet: SheetSpec,
  layout: SheetLayout,
  s: number,
): { svg: string; usesHatchPattern: boolean } {
  if (sectionSpecs.length === 0) {
    return { svg: '', usesHatchPattern: false };
  }
  const compoundBackend = new OcctBackend(shape as import('replicad').Shape3D);
  const bandOrigin: [number, number] = [
    sheet.margin,
    sheet.h - sheet.margin - sheet.titleBlock.h,
  ];
  const rendered = renderSections({
    compound: compoundBackend,
    sections: sectionSpecs,
    mainViewPlacements: layout.views,
    mainScale: s,
    bandOrigin,
    bandWidth: sheet.w - 2 * sheet.margin,
    bandHeight: SECTION_BAND_H,
  });
  return { svg: rendered.svg, usesHatchPattern: rendered.usesHatchPattern };
}

/**
 * Automatic-annotation + declared-GD&T phase. Returns the (possibly
 * extended) dimension bodies and reserves, the updated placement report, and
 * the general-tolerance note.
 */
function renderAutoStage(input: {
  parts: WorldFramePart[];
  options: SvgDrawingOptions;
  shape: AnyShape;
  layout: SheetLayout;
  styled: Record<DrawingViewName, StyledView>;
  s: number;
  sheet: SheetSpec;
  sectionsSvg: string;
  dimBodies: string[];
  bottomReserve: Record<DrawingViewName, number>;
  rightReserve: Record<DrawingViewName, number>;
  report: DrawingReport | undefined;
  diagnosticsOut: CompilerDiagnostic[];
}): {
  dimBodies: string[];
  bottomReserve: Record<DrawingViewName, number>;
  report: DrawingReport | undefined;
  generalTolerance: string | undefined;
  labelBoxes: Box[];
} {
  const {
    parts, options, shape, layout, styled, s, sheet, sectionsSvg, rightReserve, diagnosticsOut,
  } = input;
  const authored = options.annotations ?? [];
  const declarations = options.declarations ?? { datums: [], tolerances: [], dimensions: [] };
  const autoOn = options.autoAnnotate !== undefined && options.autoAnnotate !== false;
  const hasDeclarations = declarations.datums.length + declarations.tolerances.length > 0;
  let dimBodies = input.dimBodies;
  let bottomReserve = input.bottomReserve;
  let report = input.report;
  let generalTolerance: string | undefined;
  let labelBoxes: Box[] = [];

  if (autoOn || hasDeclarations) {
    const compoundBackend = parts.length === 1
      ? (parts[0].shape as OcctBackend)
      : new OcctBackend(shape as import('replicad').Shape3D);
    const auto = renderAutoDrawing({
      visibleViews: options.views,
      parts,
      compound: compoundBackend,
      autoAnnotate: options.autoAnnotate,
      ...(options.annotationOverrides ? { annotationOverrides: options.annotationOverrides } : {}),
      declarations,
      authoredDatums: authored.flatMap(a => (a.kind === 'datum' ? [{ label: a.label, face: a.face }] : [])),
      authoredSvg: dimBodies,
      views: Object.fromEntries(VIEW_NAMES.map(name => [name, {
        placement: layout.views[name],
        polylines: [...styled[name].visible, ...styled[name].tangent, ...styled[name].hidden],
      }])) as Record<DrawingViewName, { placement: ViewPlacement; polylines: Polyline2[] }>,
      scale: s,
      sheet,
      projection: options.projection ?? 'third',
      bottomReserve,
      rightReserve,
      // Cutting-plane indicators sit on the standard views; keep labels off them.
      extraObstacleSvg: sectionsSvg,
    });
    dimBodies = [...dimBodies, ...auto.svg];
    bottomReserve = auto.bottomReserve;
    generalTolerance = auto.generalTolerance;
    labelBoxes = auto.labelBoxes;
    diagnosticsOut.push(...auto.diagnostics);
    report = report === undefined
      ? auto.report
      : {
          placed: report.placed + auto.report.placed,
          overlapped: report.overlapped + auto.report.overlapped,
          byKind: { ...report.byKind, ...Object.fromEntries(Object.entries(auto.report.byKind).map(([k, v]) => [k, v + (report!.byKind[k] ?? 0)])) },
          datums: auto.report.datums,
          annotations: [...report.annotations, ...auto.report.annotations],
          ...(auto.report.generalTolerance ? { generalTolerance: auto.report.generalTolerance } : {}),
        };
  }

  return { dimBodies, bottomReserve, report, generalTolerance, labelBoxes };
}

/** Balloon / parts-list phase: draw the exploded isometric overlays and warn
 *  when their labels overlap. */
function renderExplodeOverlays(input: {
  options: SvgDrawingOptions;
  assembledCentroids: Map<string, [number, number, number]>;
  explodedCentroids: Map<string, [number, number, number]>;
  explodedParts: readonly WorldFramePart[] | undefined;
  layout: SheetLayout;
  s: number;
  effSheet: SheetSpec;
  diagnosticsOut: CompilerDiagnostic[];
}): string {
  const {
    options, assembledCentroids, explodedCentroids, explodedParts, layout, s, effSheet,
    diagnosticsOut,
  } = input;
  const bomRows = options.bomRows ?? [];
  let explodeSvg = '';
  const overlapFragments: string[] = [];
  if (options.balloons === true && bomRows.length > 0) {
    const drawn = balloonAndTraceSvg({
      assembledCentroids,
      explodedCentroids,
      bomRows,
      iso: layout.views.iso,
      scale: s,
    });
    explodeSvg += drawn.svg;
    overlapFragments.push(...drawn.fragments);
  } else if (explodedParts !== undefined) {
    const tracesOnly = balloonAndTraceSvg({
      assembledCentroids,
      explodedCentroids,
      bomRows: [],
      iso: layout.views.iso,
      scale: s,
    });
    explodeSvg += tracesOnly.svg;
  }
  if (options.partsList === true && bomRows.length > 0) {
    const table = partsListSvg({ rows: bomRows, sheet: effSheet });
    explodeSvg += table.svg;
    overlapFragments.push(table.fragment);
  }
  if (overlapFragments.length > 0) {
    const overlaps = explodeLabelOverlaps(overlapFragments);
    if (overlaps.length > 0) {
      diagnosticsOut.push({
        target: 'export-occt',
        code: 'drawing.annotation.overlap',
        severity: 'warn',
        message: `svg-drawing: ${overlaps.length} balloon/parts-list label pair(s) overlap on the sheet.`,
        hint: 'Increase the explode factor, use a larger sheet, or drop balloons/partsList on a crowded assembly.',
        nextAction: NEXT_ACTIONS['drawing.annotation.overlap'],
      });
    }
  }
  return explodeSvg;
}

/** Sheet-assembly phase: frame, view groups, dimensions, overlays and title
 *  block joined into the final SVG document. */
function buildSheetSvg(input: {
  effSheet: SheetSpec;
  usesHatchPattern: boolean;
  viewGroups: string[];
  dimBodies: string[];
  sectionsSvg: string;
  explodeSvg: string;
  generalTolerance: string | undefined;
  layout: SheetLayout;
  options: SvgDrawingOptions;
  explodedShape: AnyShape | undefined;
  diagnosticsOut: CompilerDiagnostic[];
  report: DrawingReport | undefined;
  sheetSize: DrawingSheetSize;
  projection: ProjectionAngle;
}): SvgDrawingResult {
  const {
    effSheet, usesHatchPattern, viewGroups, dimBodies, sectionsSvg, explodeSvg,
    generalTolerance, layout, options, explodedShape, diagnosticsOut, report,
    sheetSize, projection,
  } = input;
  const tb = options.titleBlock;
  const dimensions = `<g id="dimensions">` + dimBodies.join('') + `</g>`;

  const hatchDefs = usesHatchPattern
    ? `<defs><pattern id="kc-section-hatch" width="2" height="2" patternUnits="userSpaceOnUse" ` +
      `patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2" stroke="#000" stroke-width="0.2"/></pattern></defs>`
    : '';

  // --- sheet ---------------------------------------------------------------
  const frame =
    `<rect class="frame" x="${effSheet.margin}" y="${effSheet.margin}" ` +
    `width="${effSheet.w - 2 * effSheet.margin}" height="${effSheet.h - 2 * effSheet.margin}" ` +
    `fill="none" stroke="#000" stroke-width="0.35"/>`;


  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${effSheet.w} ${effSheet.h}" ` +
      `width="${effSheet.w}mm" height="${effSheet.h}mm" font-family="sans-serif" ` +
      `data-kc-format="svg-drawing" data-kc-scale="${layout.scaleText}" data-kc-units="mm"${explodedShape !== undefined ? ' data-kc-exploded="true"' : ''}` +
      // The compact sheet stays byte-identical to earlier releases; the full
      // title-block sheet also names its generator.
      `${tb === undefined ? '' : ` data-kc-sheet="${sheetSize}" data-kc-projection="${projection}" data-kc-generator="${esc(attributionGenerator())}"`}>`,
    ...(hatchDefs === '' ? [] : [hatchDefs]),
    `<rect x="0" y="0" width="${effSheet.w}" height="${effSheet.h}" fill="#fff"/>`,
    frame,
    ...viewGroups,
    dimensions,
    ...(sectionsSvg === '' ? [] : [sectionsSvg]),
    ...(explodeSvg === '' ? [] : [explodeSvg]),
    ...(generalTolerance === undefined ? [] : [generalToleranceCell(effSheet, generalTolerance)]),
    sheetTitleBlock(effSheet, options, layout.scaleText, sheetSize, projection),
    `</svg>`,
  ].join('\n');

  return {
    bytes: new TextEncoder().encode(svg),
    diagnostics: diagnosticsOut,
    ...(report === undefined ? {} : { report }),
  };
}
