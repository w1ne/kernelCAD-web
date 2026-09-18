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

import { makeCompound, type AnyShape } from 'replicad';
import type { WorldFramePart } from './sceneToWorldFrame';
import { OcctBackend } from './occtBackend';
import {
  makeDrawingCamera,
  projectShapeForDrawing,
} from './drawingProjection';
import {
  SHEETS,
  computeSheetLayout,
  dedupPolylineClasses,
  dimensionToSvg,
  formatDimValue,
  viewBoxOfPolylines,
  type DrawingViewName,
  type LinearDimension,
  type Polyline2,
  type SheetLayout,
  type SheetSpec,
  type ViewBox2,
  type ViewPlacement,
} from './drawingLayout';
import {
  renderAnnotations,
  DIM_BASE,
  type DrawingAnnotation,
} from './drawingAnnotations';
import { renderSections, type DrawingSectionSpec } from './drawingSections';
import {
  balloonAndTraceSvg,
  partsListSvg,
  explodeLabelOverlaps,
  partCentroids,
  type DrawingBomRow,
} from './drawingExplode';
import {
  renderAutoDrawing,
  type AutoAnnotateOptions,
  type DrawingReport,
} from './drawingAuto';
import type { DrawingDeclarations } from '../../../shared/intent/drawingGdtRecord';
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

export interface SvgDrawingOptions {
  format: 'svg-drawing';
  /** Sheet size; default `a4` (landscape 297×210 mm). */
  sheet?: 'a4' | 'a3';
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

const VIEW_NAMES: readonly DrawingViewName[] = ['front', 'top', 'left', 'iso'];

/** Height of the band reserved below the standard view grid for sections. */
const SECTION_BAND_H = 70;

const round3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/** Bake one model-space polyline into a sheet-space SVG path `d` string. */
function bakePath(pl: Polyline2, p: ViewPlacement, s: number): string {
  return pl
    .map(([mx, my], i) =>
      `${i === 0 ? 'M' : 'L'} ${round3(p.tx + mx * s)} ${round3(p.ty - my * s)}`)
    .join(' ');
}

function pathGroup(
  cls: string,
  style: string,
  polylines: Polyline2[],
  placement: ViewPlacement,
  scale: number,
): string {
  const paths = polylines
    .map(pl => `<path d="${bakePath(pl, placement, scale)}"/>`)
    .join('');
  return `<g class="${cls}" ${style}>${paths}</g>`;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Third-angle projection symbol: truncated-cone side view (small end
 *  toward the end view) with the end view's concentric circles beside it. */
function thirdAngleSymbol(cx: number, cy: number): string {
  // Trapezoid (frustum side view), small end facing right.
  const trap =
    `<path d="M ${round3(cx - 11)} ${round3(cy - 3.4)} L ${round3(cx - 4)} ${round3(cy - 1.9)} ` +
    `L ${round3(cx - 4)} ${round3(cy + 1.9)} L ${round3(cx - 11)} ${round3(cy + 3.4)} Z"/>`;
  // End view: two concentric circles on the small-end side.
  const circles =
    `<circle cx="${round3(cx + 6.5)}" cy="${round3(cy)}" r="3.4"/>` +
    `<circle cx="${round3(cx + 6.5)}" cy="${round3(cy)}" r="1.9"/>`;
  return `<g class="third-angle-symbol" fill="none" stroke="#000" stroke-width="0.25">${trap}${circles}</g>`;
}

/** General-tolerance cell attached to the left of the title block. */
function generalToleranceCell(sheet: SheetSpec, note: string): string {
  const { w: tbW, h } = sheet.titleBlock;
  const w = 46;
  const x = sheet.w - sheet.margin - tbW - w;
  const y = sheet.h - sheet.margin - h;
  return (
    `<g id="general-tolerance" fill="none" stroke="#000" stroke-width="0.35">` +
    `<rect x="${round3(x)}" y="${round3(y)}" width="${w}" height="${h}" fill="#fff"/>` +
    `<text x="${round3(x + 1.5)}" y="${round3(y + 3)}" font-size="1.8" fill="#555" stroke="none">GENERAL TOLERANCES</text>` +
    `<text x="${round3(x + 1.5)}" y="${round3(y + h / 2 + 2)}" font-size="3.4" fill="#000" stroke="none">${esc(note)}</text>` +
    `</g>`
  );
}

function titleBlock(
  sheet: SheetSpec,
  fields: { name: string; scaleText: string; units: string; date: string },
): string {
  const { w, h } = sheet.titleBlock;
  const x = sheet.w - sheet.margin - w;
  const y = sheet.h - sheet.margin - h;
  const rowH = h / 2;
  const nameW = w - 30;
  const cellW2 = (w - 26) / 2;
  const caption = (cx: number, cy: number, t: string) =>
    `<text x="${round3(cx)}" y="${round3(cy)}" font-size="1.8" fill="#555" stroke="none">${esc(t)}</text>`;
  const value = (cx: number, cy: number, t: string, size = 3) =>
    `<text x="${round3(cx)}" y="${round3(cy)}" font-size="${size}" fill="#000" stroke="none">${esc(t)}</text>`;
  const lines = [
    `<rect x="${round3(x)}" y="${round3(y)}" width="${w}" height="${h}" fill="#fff"/>`,
    `<line x1="${round3(x)}" y1="${round3(y + rowH)}" x2="${round3(x + w)}" y2="${round3(y + rowH)}"/>`,
    // Row 1: NAME | third-angle symbol cell.
    `<line x1="${round3(x + nameW)}" y1="${round3(y)}" x2="${round3(x + nameW)}" y2="${round3(y + rowH)}"/>`,
    // Row 2: SCALE | UNITS | DATE.
    `<line x1="${round3(x + cellW2)}" y1="${round3(y + rowH)}" x2="${round3(x + cellW2)}" y2="${round3(y + h)}"/>`,
    `<line x1="${round3(x + 2 * cellW2)}" y1="${round3(y + rowH)}" x2="${round3(x + 2 * cellW2)}" y2="${round3(y + h)}"/>`,
  ];
  return (
    `<g id="title-block" fill="none" stroke="#000" stroke-width="0.35">` +
    lines.join('') +
    caption(x + 1.5, y + 3, 'NAME') +
    value(x + 1.5, y + rowH - 3, fields.name, 3.4) +
    thirdAngleSymbol(x + nameW + 16, y + rowH / 2) +
    caption(x + 1.5, y + rowH + 3, 'SCALE') +
    value(x + 1.5, y + h - 3, fields.scaleText) +
    caption(x + cellW2 + 1.5, y + rowH + 3, 'UNITS') +
    value(x + cellW2 + 1.5, y + h - 3, fields.units) +
    caption(x + 2 * cellW2 + 1.5, y + rowH + 3, 'DATE') +
    value(x + 2 * cellW2 + 1.5, y + h - 3, fields.date) +
    `</g>`
  );
}

const VIEW_LABELS: Record<DrawingViewName, string> = {
  front: 'FRONT',
  top: 'TOP',
  left: 'LEFT',
  iso: 'ISOMETRIC',
};

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
  for (const name of names) {
    const camera = makeDrawingCamera(name);
    const raw = projectShapeForDrawing(shape, camera, {
      withHidden: name !== 'iso',
    });
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
    styled[name] = view;
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

/** Same sheet as `exportSvgDrawing`, returning diagnostics and the placement
 *  report alongside the bytes. */
export function renderSvgDrawing(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
): SvgDrawingResult {
  const diagnosticsOut: CompilerDiagnostic[] = [];
  if (parts.length === 0) {
    throw new Error('svg-drawing export requires at least one part.');
  }
  const { explodedParts, assembledCentroids, explodedCentroids, shape, explodedShape } =
    resolveDrawingBodies(parts, options);

  const sheet = SHEETS[options.sheet ?? 'a4'];
  const [bbMin, bbMax] = shape.boundingBox.bounds;
  const dims = {
    w: bbMax[0] - bbMin[0],
    d: bbMax[1] - bbMin[1],
    h: bbMax[2] - bbMin[2],
  };

  const styled = projectSheetViews(shape, explodedShape);

  const layout = computeSheetLayout(
    {
      front: styled.front.box,
      top: styled.top.box,
      left: styled.left.box,
      iso: styled.iso.box,
    },
    sheet,
  );
  const s = layout.scale;

  const dimensionStage = renderDimensionStage(parts, options, layout, s, dims, diagnosticsOut);

  // --- section views ---------------------------------------------------
  // The standard 4-view grid above is computed against the UNMODIFIED
  // `sheet` spec, so a drawing with no sections is byte-identical to one
  // from before this feature existed. Sections add a reserved band BELOW
  // that grid (where the title block used to sit) and push the title block
  // + frame down into a taller sheet — nothing above the band moves.
  const sectionSpecs = options.sections ?? [];
  const hasSections = sectionSpecs.length > 0;
  const effSheet: SheetSpec = hasSections
    ? { ...sheet, h: sheet.h + SECTION_BAND_H }
    : sheet;
  const sectionStage = renderSheetSections(shape, sectionSpecs, sheet, layout, s);
  const sectionsSvg = sectionStage.svg;
  const usesHatchPattern = sectionStage.usesHatchPattern;

  // --- automatic annotation + declared GD&T ------------------------------
  const autoStage = renderAutoStage({
    parts,
    options,
    shape,
    layout,
    styled,
    s,
    sheet,
    sectionsSvg,
    dimBodies: dimensionStage.dimBodies,
    bottomReserve: dimensionStage.bottomReserve,
    rightReserve: dimensionStage.rightReserve,
    report: dimensionStage.report,
    diagnosticsOut,
  });
  const dimBodies = autoStage.dimBodies;
  const bottomReserve = autoStage.bottomReserve;
  const report = autoStage.report;
  const generalTolerance = autoStage.generalTolerance;

  const viewGroups = renderViewGroups(styled, layout, bottomReserve, s, explodedShape);

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

  return buildSheetSvg({
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
  });
}

/**
 * Resolve the lowered shape(s) and the part centroids the overlays need.
 *
 * Centroids must be read BEFORE makeCompound / getReplicadShape: those
 * consume the replicad handles, and a later boundingBox would throw
 * "This object has been deleted". Skip the read unless balloons,
 * parts-list, or an exploded iso actually need them — exact bbox
 * tessellation would otherwise perturb the automatic dimensions.
 */
function resolveDrawingBodies(
  parts: WorldFramePart[],
  options: SvgDrawingOptions,
): {
  explodedParts: readonly WorldFramePart[] | undefined;
  assembledCentroids: Map<string, [number, number, number]>;
  explodedCentroids: Map<string, [number, number, number]>;
  shape: AnyShape;
  explodedShape: AnyShape | undefined;
} {
  const explodedParts = options.explodedParts;
  const needCentroids =
    options.balloons === true || options.partsList === true || explodedParts !== undefined;
  const assembledCentroids = needCentroids ? partCentroids(parts) : new Map();
  const explodedCentroids = explodedParts !== undefined
    ? partCentroids(explodedParts)
    : assembledCentroids;
  const shape: AnyShape =
    parts.length === 1
      ? parts[0].shape.getReplicadShape()
      : makeCompound(parts.map(p => p.shape.getReplicadShape()));
  const explodedShape: AnyShape | undefined =
    explodedParts === undefined || explodedParts.length === 0
      ? undefined
      : explodedParts.length === 1
        ? explodedParts[0]!.shape.getReplicadShape()
        : makeCompound(explodedParts.map(p => p.shape.getReplicadShape()));
  return { explodedParts, assembledCentroids, explodedCentroids, shape, explodedShape };
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
  for (const name of VIEW_NAMES) {
    const camera = makeDrawingCamera(name);
    const source = name === 'iso' && explodedShape !== undefined ? explodedShape : shape;
    const raw = projectShapeForDrawing(source, camera, {
      withHidden: name !== 'iso',
    });
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
    styled[name] = view;
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
  // --- dimensions: authored if the caller supplied any, else automatic ----
  const authored = options.annotations ?? [];
  const autoOn = options.autoAnnotate !== undefined && options.autoAnnotate !== false;
  const f = layout.views.front.box;
  const t = layout.views.top.box;
  let dimBodies: string[];
  let bottomReserve: Record<DrawingViewName, number>;
  let rightReserve: Record<DrawingViewName, number> = { front: 0, top: 0, left: 0, iso: 0 };
  let report: DrawingReport | undefined;

  if (authored.length > 0) {
    const rendered = renderAnnotations({
      parts,
      annotations: authored,
      placements: layout.views,
      scale: s,
    });
    dimBodies = rendered.svg;
    bottomReserve = rendered.bottomReserve;
    rightReserve = rendered.rightReserve;
    const crowded = new Set(rendered.overlaps.flat());
    report = {
      placed: authored.length - crowded.size,
      overlapped: crowded.size,
      byKind: authored.reduce<Record<string, number>>((acc, a) => {
        acc[a.kind] = (acc[a.kind] ?? 0) + 1;
        return acc;
      }, {}),
      datums: [],
      annotations: authored.map((a, i) => ({
        kind: a.kind,
        view: a.view ?? 'front',
        text: 'text' in a && a.text !== undefined ? a.text : a.kind === 'datum' ? `datum ${a.label}` : a.kind,
        overlapped: crowded.has(i),
      })),
    };
    if (rendered.overlaps.length > 0) {
      const pairs = rendered.overlaps.map(([i, j]) => `annotations[${i}] / annotations[${j}]`).join(', ');
      diagnosticsOut.push({
        target: 'export-occt',
        code: 'drawing.annotation.overlap',
        severity: 'warn',
        message: `svg-drawing: ${rendered.overlaps.length} annotation pair(s) have overlapping rendered labels: ${pairs}.`,
        hint: 'Reorder the annotations array, pass a different `view`, or add `offset` to push one of them further out.',
        nextAction: NEXT_ACTIONS['drawing.annotation.overlap'],
      });
    }
  } else if (autoOn) {
    dimBodies = [];
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
    dimBodies = dimSpecs.map(d => dimensionToSvg(d));
    // Only the front view carries a bottom-stacked (width) dimension.
    bottomReserve = { front: DIM_BASE, top: 0, left: 0, iso: 0 };
  }

  return { dimBodies, bottomReserve, rightReserve, report };
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
} {
  const {
    parts, options, shape, layout, styled, s, sheet, sectionsSvg, rightReserve, diagnosticsOut,
  } = input;
  const authored = options.annotations ?? [];
  const declarations = options.declarations ?? { datums: [], tolerances: [] };
  const autoOn = options.autoAnnotate !== undefined && options.autoAnnotate !== false;
  const hasDeclarations = declarations.datums.length + declarations.tolerances.length > 0;
  let dimBodies = input.dimBodies;
  let bottomReserve = input.bottomReserve;
  let report = input.report;
  let generalTolerance: string | undefined;

  if (autoOn || hasDeclarations) {
    const compoundBackend = parts.length === 1
      ? (parts[0].shape as OcctBackend)
      : new OcctBackend(shape as import('replicad').Shape3D);
    const auto = renderAutoDrawing({
      parts,
      compound: compoundBackend,
      autoAnnotate: options.autoAnnotate,
      declarations,
      authoredDatums: authored.flatMap(a => (a.kind === 'datum' ? [{ label: a.label, face: a.face }] : [])),
      authoredSvg: dimBodies,
      views: Object.fromEntries(VIEW_NAMES.map(name => [name, {
        placement: layout.views[name],
        polylines: [...styled[name].visible, ...styled[name].tangent, ...styled[name].hidden],
      }])) as Record<DrawingViewName, { placement: ViewPlacement; polylines: Polyline2[] }>,
      scale: s,
      sheet,
      bottomReserve,
      rightReserve,
      // Cutting-plane indicators sit on the standard views; keep labels off them.
      extraObstacleSvg: sectionsSvg,
    });
    dimBodies = [...dimBodies, ...auto.svg];
    bottomReserve = auto.bottomReserve;
    generalTolerance = auto.generalTolerance;
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

  return { dimBodies, bottomReserve, report, generalTolerance };
}

/** View-groups phase: one styled `<g>` per standard view, with the caption
 *  pushed below any dimension band the view carries. */
function renderViewGroups(
  styled: Record<DrawingViewName, StyledView>,
  layout: SheetLayout,
  bottomReserve: Record<DrawingViewName, number>,
  s: number,
  explodedShape: AnyShape | undefined,
): string[] {
  return VIEW_NAMES.map(name => {
    const v = styled[name];
    const p = layout.views[name];
    // A view carrying dimensions underneath must push its caption below the
    // deepest of them, or the two collide. With the automatic bbox dimensions
    // this reserves the front view's single 8 mm band (label at 13 mm), which
    // is exactly where the caption sat before annotations existed.
    const labelOffset = 5 + bottomReserve[name];
    const label =
      `<text class="view-label" x="${round3(p.box.x + p.box.w / 2)}" ` +
      `y="${round3(p.box.y + p.box.h + labelOffset)}" font-size="2.6" text-anchor="middle" ` +
      `fill="#555" stroke="none">${name === 'iso' && explodedShape !== undefined ? 'ISOMETRIC — EXPLODED' : VIEW_LABELS[name]}</text>`;
    return (
      `<g id="view-${name}" data-view="${name}" fill="none" stroke="#000" ` +
      `stroke-linecap="round" stroke-linejoin="round">` +
      pathGroup('hidden', 'stroke-width="0.25" stroke-dasharray="1.6 0.8"', v.hidden, p, s) +
      pathGroup('tangent', 'stroke-width="0.13"', v.tangent, p, s) +
      pathGroup('visible', 'stroke-width="0.5"', v.visible, p, s) +
      label +
      `</g>`
    );
  });
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
}): SvgDrawingResult {
  const {
    effSheet, usesHatchPattern, viewGroups, dimBodies, sectionsSvg, explodeSvg,
    generalTolerance, layout, options, explodedShape, diagnosticsOut, report,
  } = input;
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
      `data-kc-format="svg-drawing" data-kc-scale="${layout.scaleText}" data-kc-units="mm"${explodedShape !== undefined ? ' data-kc-exploded="true"' : ''}>`,
    ...(hatchDefs === '' ? [] : [hatchDefs]),
    `<rect x="0" y="0" width="${effSheet.w}" height="${effSheet.h}" fill="#fff"/>`,
    frame,
    ...viewGroups,
    dimensions,
    ...(sectionsSvg === '' ? [] : [sectionsSvg]),
    ...(explodeSvg === '' ? [] : [explodeSvg]),
    ...(generalTolerance === undefined ? [] : [generalToleranceCell(effSheet, generalTolerance)]),
    titleBlock(effSheet, {
      name: options.modelName ?? 'model',
      scaleText: layout.scaleText,
      units: 'mm',
      date: options.date ?? '—',
    }),
    `</svg>`,
  ].join('\n');

  return {
    bytes: new TextEncoder().encode(svg),
    diagnostics: diagnosticsOut,
    ...(report === undefined ? {} : { report }),
  };
}
