// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAnnotations.ts
//
// User-authored annotations for the engineering-drawing sheet: linear,
// radius, diameter and angular dimensions plus notes with leader lines.
//
// The exporter's built-in dimensions can only ever state the overall bounding
// box. This module is the surface through which a script says "dimension THIS
// hole" / "call out THAT slot". It owns three jobs:
//
//   1. ADDRESSING — annotations name geometry with the same `EdgeQuery` /
//      `FaceQuery` vocabulary that `fillet` / `chamfer` / `selectEdge` use, so
//      there is one way to point at geometry in kernelCAD, not two. An
//      explicit model-space point is accepted as the escape hatch.
//   2. ANCHORING — every annotation resolves to MODEL-space 3D points, which
//      are then pushed through exactly the transform the geometry took:
//      3D → model-2D (`projectPointForDrawing`, shared basis with the HLR
//      camera) → sheet mm (`ViewPlacement`). Nothing is anchored in sheet
//      coordinates, so annotations stay welded to their features when the
//      drawing scale changes.
//   3. HONESTY — an annotation whose geometry cannot be resolved is never
//      dropped. Every failure is collected and thrown as one `KernelError`
//      naming each annotation and why it failed. A drawing that quietly omits
//      a dimension the author asked for is worse than one that errors.
//
// Scale invariance: positions scale with the drawing, TEXT AND LEADERS DO NOT.
// Every constant below is sheet millimetres and is applied after the model→
// sheet transform, so a 1:5 sheet and a 2:1 sheet get identical text height,
// arrowheads, leader stems and dimension-line spacing.

import type { Edge, Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery } from './edgeQueries';
import { KernelError } from '../../../shared/intent/kernelError';
import type { Vec3 } from '../../../shared/intent/types';
import type { EdgeQuery, FaceQuery } from '../../../shared/intent/queryTypes';
import type { WorldFramePart } from './sceneToWorldFrame';
import { projectPointForDrawing } from './drawingProjection';
import {
  angularDimensionToSvg,
  dimensionToSvg,
  formatDimValue,
  leaderNoteToSvg,
  radialDimensionToSvg,
  type DrawingViewName,
  type LinearDimension,
  type Pt2,
  type ViewPlacement,
} from './drawingLayout';

// ---------------------------------------------------------------------------
// Authoring surface
// ---------------------------------------------------------------------------

/**
 * Where an annotation attaches. Either an explicit model-space point, or a
 * query naming geometry the way every other kernelCAD selector does.
 * An edge resolves to its curve midpoint, a face to its centre.
 */
export type DrawingAnchor =
  | Vec3
  | { edge: EdgeQuery }
  | { face: FaceQuery };

/**
 * One authored annotation. Deliberately one flat discriminated union with a
 * single shared `view` / `text` / `offset` triple — the fewest fields that can
 * express all five annotation kinds.
 *
 * - `view` — which sheet view to draw on. Default `'front'`.
 * - `text` — override the computed label (units and prefixes are then yours).
 * - `offset` — push the annotation further away from the geometry, in SHEET
 *   millimetres, on top of the automatic placement: extra dimension-line
 *   distance for `linear`/`angular`, extra leader-stem length for
 *   `radius`/`diameter`/`note`.
 */
/**
 * A dimension tolerance, attached to a `linear` annotation via `tol`.
 * - `number` — symmetric bilateral, rendered `± <n>`.
 * - `{ plus, minus }` — asymmetric bilateral, rendered `+<plus>/−<minus>`.
 * - `string` — a fit class (e.g. `'H7'`), rendered verbatim after the value.
 */
export type DimensionTolerance = number | { plus: number; minus: number } | string;

/** The six GD&T characteristics this slice supports (ASME Y14.5 symbols),
 *  and the diametral / material-condition modifier on a tolerance value.
 *  Single-sourced with the `shape.tolerance` capture record. */
export type { GdtType, GdtModifier } from '../../../shared/intent/drawingGdtRecord';
import type { GdtType, GdtModifier } from '../../../shared/intent/drawingGdtRecord';

export type DrawingAnnotation =
  | {
      kind: 'linear';
      from: DrawingAnchor;
      to: DrawingAnchor;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
      /** Appended to the label: `± 0.1`, `+0.2/−0.05`, or a fit class like `'H7'`. */
      tol?: DimensionTolerance;
    }
  | {
      kind: 'radius' | 'diameter';
      /** A circular edge — the hole rim, boss rim or fillet arc to call out. */
      edge: EdgeQuery;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'angular';
      /** The two straight edges whose included angle is measured. */
      from: EdgeQuery;
      to: EdgeQuery;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'note';
      at: DrawingAnchor;
      text: string;
      view?: DrawingViewName;
      offset?: number;
    }
  | {
      kind: 'hole';
      /** The hole's entry rim — a circular edge. */
      edge: EdgeQuery;
      /** Through hole. Mutually exclusive with `depth`; exactly one is required. */
      through?: boolean;
      /** Blind-hole depth (mm). Mutually exclusive with `through`. */
      depth?: number;
      /** Larger-diameter counterbore, drawn with the `⌴` symbol. */
      counterbore?: { diameter: number; depth: number };
      /** Conical countersink, drawn with the `⌵` symbol. */
      countersink?: { diameter: number; angleDeg: number };
      /** Pattern count — prefixes the label `<count>× `. */
      count?: number;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'fillet';
      /** The fillet's circular boundary arc. */
      edge: EdgeQuery;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'chamfer';
      /** The chamfer's boundary edge — used only to anchor the leader; the
       *  leg size is not recoverable from the edge alone (no feature-history
       *  access at export time), so it is author-supplied via `size`. */
      edge: EdgeQuery;
      /** Chamfer leg size (mm). */
      size: number;
      /** Chamfer angle, degrees from the adjacent face. Default 45. */
      angleDeg?: number;
      view?: DrawingViewName;
      text?: string;
      offset?: number;
    }
  | {
      kind: 'datum';
      /** The face this datum feature symbol identifies. */
      face: FaceQuery;
      /** Single-letter (or short) datum reference, e.g. `'A'`. */
      label: string;
      view?: DrawingViewName;
      offset?: number;
    }
  | {
      kind: 'fcf';
      /** The toleranced feature — an edge or a face. Exactly one is required. */
      edge?: EdgeQuery;
      face?: FaceQuery;
      type: GdtType;
      value: number;
      /** Datum references in precedence order, e.g. `['A', 'B']`. */
      datums?: string[];
      modifier?: GdtModifier;
      view?: DrawingViewName;
      offset?: number;
    };

// ---------------------------------------------------------------------------
// Placement constants (all SHEET millimetres — never multiplied by the scale)
// ---------------------------------------------------------------------------

/** First dimension line sits this far outside the view's sheet bbox. Matches
 *  the built-in bounding-box dimensions so authored and automatic sheets read
 *  the same. */
export const DIM_BASE = 8;
/** Each further dimension on the same view+side stacks out by this much. */
export const DIM_STEP = 8;
/** Arc radius for the first angular dimension on a view. */
const ANGULAR_RADIUS = 12;
/** First leader points up-and-right (sheet coords are y-down, hence −45°). */
const LEADER_BASE_ANGLE = -Math.PI / 4;
/** Successive leaders in the same view rotate by this much so two callouts on
 *  nearby features never lie on top of each other. */
const LEADER_STEP_ANGLE = -Math.PI / 6;

// ---------------------------------------------------------------------------
// Geometry resolution
// ---------------------------------------------------------------------------

/** Author-supplied label text lands directly in the SVG, so it must be
 *  escaped here — the built-in dimension labels are numeric and never needed
 *  it, which is exactly why the renderer does not escape for us. */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Attribute-safe escaping (adds quotes to the text escaping above). */
export const escAttr = (s: string): string => esc(s).replace(/"/g, '&quot;');

const isVec3 = (a: DrawingAnchor): a is Vec3 =>
  Array.isArray(a) && a.length === 3 && a.every(n => typeof n === 'number');

/** Describe an annotation compactly enough to name it in a diagnostic. */
function describe(a: DrawingAnnotation, index: number): string {
  return `annotations[${index}] (${a.kind}${a.view ? `, view '${a.view}'` : ''})`;
}

/**
 * Resolve a query across every part on the sheet. Parts arrive in world frame,
 * so a query is answered against the same coordinates the projection sees.
 * Matches are pooled across parts because the author addresses "the sheet",
 * not "part 3".
 */
function resolveAcrossParts<Q, R>(
  parts: readonly WorldFramePart[],
  query: Q,
  resolve: (shape: OcctBackend, q: Q) => R[],
): R[] {
  const out: R[] = [];
  for (const p of parts) {
    try {
      out.push(...resolve(p.shape as OcctBackend, query));
    } catch {
      // A query key that a particular part's topology cannot answer (e.g. a
      // face type that body has none of) is not an error for the sheet — the
      // caller's "zero total matches" check is the real gate.
    }
  }
  return out;
}

class Unresolved extends Error {}

const fail = (why: string): never => {
  throw new Unresolved(why);
};

function oneEdge(parts: readonly WorldFramePart[], q: EdgeQuery, role: string): Edge {
  const matches = resolveAcrossParts(parts, q, resolveEdgeQuery);
  if (matches.length === 0) fail(`${role}: no edge matched ${JSON.stringify(q)}`);
  // `near` is the documented disambiguator throughout the selector API — it
  // sorts closest-first, so honouring it here keeps the same contract.
  if (matches.length > 1 && q.near === undefined) {
    fail(`${role}: ${matches.length} edges matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

function oneFace(parts: readonly WorldFramePart[], q: FaceQuery, role: string): Face {
  const matches = resolveAcrossParts(parts, q, resolveFaceQuery);
  if (matches.length === 0) fail(`${role}: no face matched ${JSON.stringify(q)}`);
  if (matches.length > 1 && q.near === undefined) {
    fail(`${role}: ${matches.length} faces matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

/**
 * Curve midpoint of an edge. Deliberately `pointAt(0.5)` rather than the
 * endpoint average used by the selector summary: for a CLOSED circular edge
 * the endpoints coincide, so the endpoint average degenerates to a single
 * point on the rim and an annotation anchored there would sit in the wrong
 * place entirely.
 */
function edgeMid(e: Edge): Vec3 {
  const p = e.pointAt(0.5);
  return [p.x, p.y, p.z];
}

class UnresolvedWithCode extends Error {
  readonly code: 'drawing.datum.unresolved' | 'drawing.tolerance.feature-unresolved';
  constructor(code: 'drawing.datum.unresolved' | 'drawing.tolerance.feature-unresolved', message: string) {
    super(message);
    this.code = code;
  }
}

const failCode = (code: UnresolvedWithCode['code'], why: string): never => {
  throw new UnresolvedWithCode(code, why);
};

function oneFaceCoded(
  parts: readonly WorldFramePart[],
  q: FaceQuery,
  role: string,
  code: UnresolvedWithCode['code'],
): Face {
  const matches = resolveAcrossParts(parts, q, resolveFaceQuery);
  if (matches.length === 0) return failCode(code, `${role}: no face matched ${JSON.stringify(q)}`);
  if (matches.length > 1 && q.near === undefined) {
    return failCode(code, `${role}: ${matches.length} faces matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

function oneEdgeCoded(
  parts: readonly WorldFramePart[],
  q: EdgeQuery,
  role: string,
  code: UnresolvedWithCode['code'],
): Edge {
  const matches = resolveAcrossParts(parts, q, resolveEdgeQuery);
  if (matches.length === 0) return failCode(code, `${role}: no edge matched ${JSON.stringify(q)}`);
  if (matches.length > 1 && q.near === undefined) {
    return failCode(code, `${role}: ${matches.length} edges matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

function resolveAnchor(
  parts: readonly WorldFramePart[],
  anchor: DrawingAnchor,
  role: string,
): Vec3 {
  if (isVec3(anchor)) return anchor;
  if ('edge' in anchor) return edgeMid(oneEdge(parts, anchor.edge, role));
  if ('face' in anchor) {
    const c = oneFace(parts, anchor.face, role).center;
    return [c.x, c.y, c.z];
  }
  return fail(`${role}: anchor must be a [x,y,z] point, { edge: … } or { face: … }`);
}

/**
 * Centre and radius of a circular edge, in model space.
 *
 * Solved from three points sampled on the curve (the circumcentre / circum-
 * radius of the triangle they form) — the same technique the selector's
 * `radius` summary uses, and it needs no OCCT symbol beyond `pointAt`.
 * Non-circular edges are rejected rather than approximated.
 */
function circleOf(e: Edge, role: string): { center: Vec3; radius: number } {
  const geom = (e as unknown as { geomType?: string }).geomType;
  if (geom !== 'CIRCLE') {
    fail(`${role}: edge is a ${geom ?? 'UNKNOWN'}, not a CIRCLE — radius/diameter needs a circular edge`);
  }
  const a = e.pointAt(0);
  const b = e.pointAt(1 / 3);
  const c = e.pointAt(2 / 3);
  const A: Vec3 = [a.x, a.y, a.z];
  const ab: Vec3 = [b.x - a.x, b.y - a.y, b.z - a.z];
  const ac: Vec3 = [c.x - a.x, c.y - a.y, c.z - a.z];
  const n: Vec3 = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const n2 = n[0] * n[0] + n[1] * n[1] + n[2] * n[2];
  if (n2 < 1e-18) fail(`${role}: circular edge samples are collinear — cannot solve a centre`);
  const ab2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const ac2 = ac[0] * ac[0] + ac[1] * ac[1] + ac[2] * ac[2];
  // Circumcentre relative to A: (|ab|²·(ac×n) + |ac|²·(n×ab)) / 2|n|².
  const t1: Vec3 = [
    ac[1] * n[2] - ac[2] * n[1],
    ac[2] * n[0] - ac[0] * n[2],
    ac[0] * n[1] - ac[1] * n[0],
  ];
  const t2: Vec3 = [
    n[1] * ab[2] - n[2] * ab[1],
    n[2] * ab[0] - n[0] * ab[2],
    n[0] * ab[1] - n[1] * ab[0],
  ];
  const k = 1 / (2 * n2);
  const rel: Vec3 = [
    (ab2 * t1[0] + ac2 * t2[0]) * k,
    (ab2 * t1[1] + ac2 * t2[1]) * k,
    (ab2 * t1[2] + ac2 * t2[2]) * k,
  ];
  return {
    center: [A[0] + rel[0], A[1] + rel[1], A[2] + rel[2]],
    radius: Math.hypot(rel[0], rel[1], rel[2]),
  };
}

// ---------------------------------------------------------------------------
// Model → sheet
// ---------------------------------------------------------------------------

/** The one transform every annotation goes through, identical to the one
 *  `bakePath` applies to projected geometry: model 3D → model 2D (y up) →
 *  sheet mm (y down). */
export function modelToSheet(
  p: Vec3,
  view: DrawingViewName,
  placement: ViewPlacement,
  scale: number,
): Pt2 {
  const [mx, my] = projectPointForDrawing(p, view);
  return [placement.tx + mx * scale, placement.ty - my * scale];
}

// ---------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Feature-aware labels
// ---------------------------------------------------------------------------

/** Render a `tol` field into the suffix appended after a dimension value. */
function tolText(tol: DimensionTolerance): string {
  if (typeof tol === 'string') return ` ${tol}`;
  if (typeof tol === 'number') return ` ± ${formatDimValue(tol)}`;
  return ` +${formatDimValue(tol.plus)}/−${formatDimValue(tol.minus)}`;
}

/** `⌀6.5 THRU`, blind `⌀6.5 ▾ 10`, with optional `⌴`/`⌵` counterbore /
 *  countersink suffixes and a leading `<count>× ` pattern prefix. */
function holeLabel(
  a: Extract<DrawingAnnotation, { kind: 'hole' }>,
  diameter: number,
  role: string,
): string {
  if (a.through === undefined && a.depth === undefined) {
    fail(`${role}: a 'hole' annotation needs either 'through: true' or a 'depth'`);
  }
  if (a.through && a.depth !== undefined) {
    fail(`${role}: a 'hole' annotation cannot set both 'through' and 'depth'`);
  }
  let s = `⌀${formatDimValue(diameter)}`;
  s += a.through ? ' THRU' : ` ▾ ${formatDimValue(a.depth as number)}`;
  if (a.counterbore) {
    s += ` ⌴⌀${formatDimValue(a.counterbore.diameter)} ▾ ${formatDimValue(a.counterbore.depth)}`;
  }
  if (a.countersink) {
    s += ` ⌵⌀${formatDimValue(a.countersink.diameter)} × ${formatDimValue(a.countersink.angleDeg)}°`;
  }
  if (a.count !== undefined && a.count > 1) s = `${a.count}× ${s}`;
  return s;
}

export const GDT_SYMBOL: Record<GdtType, string> = {
  position: '⌖',
  flatness: '⏥',
  perpendicularity: '⟂',
  parallelism: '∥',
  concentricity: '⌾',
  cylindricity: '⌭',
};

/** Feature-control-frame cell text, author order: [symbol][value(+mod)][datums...]. */
export function fcfCells(a: { type: GdtType; value: number; datums?: readonly string[]; modifier?: GdtModifier }): string[] {
  const modPrefix = a.modifier === '⌀' ? '⌀' : '';
  const modSuffix = a.modifier === 'M' ? ' Ⓜ' : a.modifier === 'S' ? ' Ⓢ' : '';
  const cells = [GDT_SYMBOL[a.type], `${modPrefix}${formatDimValue(a.value)}${modSuffix}`];
  for (const d of a.datums ?? []) cells.push(d);
  return cells;
}

/** FCF cell geometry, sheet mm. Each cell is sized to its text (estimated
 *  with the same glyph-width factor the overlap check uses) so a `⌀0.05`
 *  never spills out of its box; the width is a pure function of the text, so
 *  output stays byte-deterministic. */
export const FCF_CELL_H = 5;
const FCF_FONT = 3;
const FCF_CELL_MIN_W = 5;

export function fcfCellWidth(text: string): number {
  return Math.max(FCF_CELL_MIN_W, Math.round((text.length * FCF_FONT * 0.62 + 2) * 10) / 10);
}

/** Total width of a frame with these cells, sheet mm. */
export function fcfFrameWidth(cells: readonly string[]): number {
  return cells.reduce((w, c) => w + fcfCellWidth(c), 0);
}

/** The frame itself (adjoining rectangles + centred cell text), top-left at
 *  (x, top). No leader. */
export function fcfFrameSvg(x: number, top: number, cells: readonly string[]): string {
  const parts: string[] = [];
  let cx = x;
  for (const text of cells) {
    const w = fcfCellWidth(text);
    parts.push(
      `<rect x="${round3(cx)}" y="${round3(top)}" width="${round3(w)}" height="${FCF_CELL_H}"/>`,
      `<text x="${round3(cx + w / 2)}" y="${round3(top + FCF_CELL_H / 2 + 1)}" font-size="${FCF_FONT}" ` +
        `text-anchor="middle" fill="#000" stroke="none">${esc(text)}</text>`,
    );
    cx += w;
  }
  return parts.join('');
}

/** Row of adjoining rectangles (the ASME Y14.5 feature control frame) with a
 *  leader from `target` to the frame's leader-side edge. */
export function fcfToSvg(target: Pt2, angle: number, cells: string[], stemExtra: number, attrs = ''): string {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const stem = 7 + stemExtra;
  const ex = target[0] + ux * stem;
  const ey = target[1] + uy * stem;
  const dir = ux >= 0 ? 1 : -1;
  // Frame's leader-side edge sits at the elbow; cells extend outward from there.
  const frameLeft = dir === 1 ? ex : ex - fcfFrameWidth(cells);
  const top = ey - FCF_CELL_H / 2;
  return (
    `<g class="dim fcf"${attrs} fill="none" stroke="#000" stroke-width="0.18">` +
    `<line x1="${round3(target[0])}" y1="${round3(target[1])}" x2="${round3(ex)}" y2="${round3(ey)}"/>` +
    fcfFrameSvg(frameLeft, top, cells) +
    `</g>`
  );
}

/** ASME datum-feature symbol: a square box holding the letter, attached to
 *  the referenced face by a leader with a filled triangular base. */
export function datumSymbolToSvg(target: Pt2, angle: number, label: string, stemExtra: number, attrs = ''): string {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const stem = 6 + stemExtra;
  const ex = target[0] + ux * stem;
  const ey = target[1] + uy * stem;
  const { cx: boxCx, cy: boxCy } = datumBoxCentre(ex, ey, ux, uy);
  const bx = boxCx - DATUM_BOX / 2;
  const by = boxCy - DATUM_BOX / 2;
  // Filled datum triangle: base on the feature surface at the target, apex
  // pointing along the leader toward the frame.
  const px = -uy, py = ux;
  const baseW = 1.2;
  const triangle =
    `<path d="M ${round3(target[0] + px * baseW)} ${round3(target[1] + py * baseW)} ` +
    `L ${round3(target[0] - px * baseW)} ${round3(target[1] - py * baseW)} ` +
    `L ${round3(target[0] + ux * 2.4)} ${round3(target[1] + uy * 2.4)} Z" ` +
    `fill="#000" stroke="none"/>`;
  return (
    `<g class="dim datum"${attrs} fill="none" stroke="#000" stroke-width="0.18">` +
    `<line x1="${round3(target[0])}" y1="${round3(target[1])}" x2="${round3(ex)}" y2="${round3(ey)}"/>` +
    triangle +
    `<rect x="${round3(bx)}" y="${round3(by)}" width="${DATUM_BOX}" height="${DATUM_BOX}"/>` +
    `<text x="${round3(boxCx)}" y="${round3(boxCy + 1.2)}" font-size="3.4" text-anchor="middle" ` +
    `fill="#000" stroke="none">${esc(label)}</text>` +
    `</g>`
  );
}

/** Datum frame side, sheet mm. */
export const DATUM_BOX = 5;

/** Centre of the datum frame for a leader ending at (ex, ey) along (ux, uy):
 *  beside the elbow for a mostly horizontal leader, above / below it
 *  (centred on the leader) for a mostly vertical one. */
export function datumBoxCentre(ex: number, ey: number, ux: number, uy: number): { cx: number; cy: number } {
  if (Math.abs(ux) >= Math.abs(uy)) {
    return { cx: ex + (ux >= 0 ? DATUM_BOX / 2 : -DATUM_BOX / 2), cy: ey };
  }
  return { cx: ex, cy: ey + (uy >= 0 ? DATUM_BOX / 2 : -DATUM_BOX / 2) };
}

const round3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

export interface AnnotationRenderInput {
  parts: readonly WorldFramePart[];
  annotations: readonly DrawingAnnotation[];
  placements: Record<DrawingViewName, ViewPlacement>;
  scale: number;
}

export interface AnnotationRenderResult {
  /** SVG fragments, one `<g class="dim…">` per annotation, in author order. */
  svg: string[];
  /** Sheet-mm depth reserved below each view by bottom-stacked dimensions.
   *  The exporter pushes view labels below this so they never collide. */
  bottomReserve: Record<DrawingViewName, number>;
  /** Sheet-mm depth reserved to the right of each view by vertical linear
   *  dimensions, so automatic dimensions can stack beyond them. */
  rightReserve: Record<DrawingViewName, number>;
  /** Pairs of DIFFERENT annotations whose rendered text bounding boxes
   *  overlap on the sheet — see `detectLabelOverlaps` below. Non-fatal: the
   *  caller surfaces `drawing.annotation.overlap` as a warning, it never
   *  fails the export (an annotation crowding another is still readable
   *  more often than not; a missing dimension is not). */
  overlaps: ReadonlyArray<readonly [number, number]>;
}

// ---------------------------------------------------------------------------
// Overlap detection (drawing.annotation.overlap)
// ---------------------------------------------------------------------------

export interface TextBox {
  x0: number; y0: number; x1: number; y1: number;
  ownerIndex: number;
}

/** Average glyph width as a fraction of font-size for our sans-serif label
 *  text — wide enough that this over-estimates rather than under-estimates
 *  width (a false positive "overlap" warning is far cheaper than a missed
 *  one for a diagnostic whose whole point is to flag crowding). */
const CHAR_WIDTH_FACTOR = 0.62;
const LINE_HEIGHT_FACTOR = 1.15;

/**
 * Pull an approximate sheet-space bounding box out of every axis-aligned
 * `<text>` element in one annotation's rendered SVG fragment. Rotated
 * labels (the vertical `linear` dimension uses `transform="rotate(-90 …)"`)
 * are skipped — estimating a rotated glyph box needs the pivot and would
 * otherwise silently mis-flag or miss overlaps; excluding them is honest
 * about what this check covers rather than pretending precision it doesn't
 * have.
 */
export function extractTextBoxes(svgFragment: string, ownerIndex: number): TextBox[] {
  const boxes: TextBox[] = [];
  const re = /<text x="([-\d.]+)" y="([-\d.]+)" font-size="([\d.]+)"([^>]*)>([^<]*)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svgFragment)) !== null) {
    const [, xs, ys, fs, rest] = m;
    if (rest.includes('transform=')) continue;
    const content = m[5];
    const x = Number(xs);
    const y = Number(ys);
    const fontSize = Number(fs);
    const anchorMatch = /text-anchor="(start|middle|end)"/.exec(rest);
    const anchor = anchorMatch ? anchorMatch[1] : 'start';
    const width = Math.max(content.length, 1) * fontSize * CHAR_WIDTH_FACTOR;
    const height = fontSize * LINE_HEIGHT_FACTOR;
    const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
    boxes.push({ x0: left, y0: y - height * 0.8, x1: left + width, y1: y + height * 0.25, ownerIndex });
  }
  return boxes;
}

const boxesOverlap = (a: TextBox, b: TextBox): boolean =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Every pair of DIFFERENT annotations (by index into the author's
 *  `annotations` array) whose rendered label boxes overlap. A label's own
 *  multi-cell group (an `fcf`'s three boxes) is expected to sit adjacent to
 *  itself, so only cross-annotation pairs count. */
export function detectLabelOverlaps(svgByIndex: readonly string[]): Array<readonly [number, number]> {
  const boxes = svgByIndex.flatMap((svg, i) => extractTextBoxes(svg, i));
  const pairs = new Set<string>();
  const out: Array<readonly [number, number]> = [];
  for (let a = 0; a < boxes.length; a++) {
    for (let b = a + 1; b < boxes.length; b++) {
      if (boxes[a].ownerIndex === boxes[b].ownerIndex) continue;
      if (!boxesOverlap(boxes[a], boxes[b])) continue;
      const [lo, hi] = boxes[a].ownerIndex < boxes[b].ownerIndex
        ? [boxes[a].ownerIndex, boxes[b].ownerIndex]
        : [boxes[b].ownerIndex, boxes[a].ownerIndex];
      const key = `${lo}:${hi}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      out.push([lo, hi]);
    }
  }
  return out;
}

interface AnnotationRenderContext {
  parts: readonly WorldFramePart[];
  view: DrawingViewName;
  placement: ViewPlacement;
  scale: number;
  role: string;
  extra: number;
  nextIndex: (view: DrawingViewName, side: string) => number;
  bottomReserve: Record<DrawingViewName, number>;
  rightReserve: Record<DrawingViewName, number>;
  toSheet: (p: Vec3) => Pt2;
}

/** One `linear` dimension: orientation, stacking side and label. */
function linearAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'linear' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, placement, role, extra, nextIndex, bottomReserve, rightReserve, toSheet } = ctx;
  const model0 = resolveAnchor(parts, a.from, `${role}.from`);
  const model1 = resolveAnchor(parts, a.to, `${role}.to`);
  const p0 = toSheet(model0);
  const p1 = toSheet(model1);
  // Orientation is read off the SHEET span so the dimension reads the
  // way the feature looks in this view; the LABEL is the true model
  // distance along that same axis, so it is scale-independent.
  const horizontal = Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1]);
  const m0 = projectPointForDrawing(model0, view);
  const m1 = projectPointForDrawing(model1, view);
  const measured = horizontal
    ? Math.abs(m1[0] - m0[0])
    : Math.abs(m1[1] - m0[1]);
  const side = horizontal ? 'bottom' : 'right';
  const dist = DIM_BASE + nextIndex(view, side) * DIM_STEP + extra;
  const box = placement.box;
  const dim: LinearDimension = horizontal
    ? {
        kind: 'horizontal',
        from: [p0[0], p0[1]],
        to: [p1[0], p1[1]],
        linePos: box.y + box.h + dist,
        label: a.text ? esc(a.text) : formatDimValue(measured),
      }
    : {
        kind: 'vertical',
        from: [p0[0], p0[1]],
        to: [p1[0], p1[1]],
        linePos: box.x + box.w + dist,
        label: a.text ? esc(a.text) : formatDimValue(measured),
      };
  if (horizontal) {
    bottomReserve[view] = Math.max(bottomReserve[view], dist);
  } else {
    rightReserve[view] = Math.max(rightReserve[view], dist);
  }
  if (a.tol !== undefined && !a.text) {
    dim.label = `${dim.label}${tolText(a.tol)}`;
  }
  return dimensionToSvg(dim);
}

/** One `radius` / `diameter` callout with its leader. */
function radialAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'radius' | 'diameter' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, scale, role, extra, nextIndex, toSheet } = ctx;
  const edge = oneEdge(parts, a.edge, role);
  const { center, radius } = circleOf(edge, role);
  const value = a.kind === 'diameter' ? radius * 2 : radius;
  const prefix = a.kind === 'diameter' ? '⌀' : 'R';
  return radialDimensionToSvg({
    kind: a.kind,
    center: toSheet(center),
    // Model radius through the same scale as every other length.
    radius: radius * scale,
    angle: LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
    label: a.text ? esc(a.text) : `${prefix}${formatDimValue(value)}`,
    stemExtra: extra,
  });
}

/** One `angular` dimension between two straight edges, normalised to the
 *  short sweep. */
function angularAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'angular' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, placement, scale, role, extra, nextIndex } = ctx;
  const eA = oneEdge(parts, a.from, `${role}.from`);
  const eB = oneEdge(parts, a.to, `${role}.to`);
  const ray = (e: Edge) => {
    const s = e.startPoint;
    const t = e.endPoint;
    const p = projectPointForDrawing([s.x, s.y, s.z], view);
    const q = projectPointForDrawing([t.x, t.y, t.z], view);
    return { p, d: [q[0] - p[0], q[1] - p[1]] as const };
  };
  const A = ray(eA);
  const B = ray(eB);
  const det = A.d[0] * B.d[1] - A.d[1] * B.d[0];
  if (Math.abs(det) < 1e-9) {
    fail(`${role}: the two edges are parallel in view '${view}' — no apex to measure from`);
  }
  // Apex = intersection of the two infinite lines in model-2D, so it
  // survives the scale change exactly like every other anchor.
  const t = ((B.p[0] - A.p[0]) * B.d[1] - (B.p[1] - A.p[1]) * B.d[0]) / det;
  const apex2: Pt2 = [A.p[0] + A.d[0] * t, A.p[1] + A.d[1] * t];
  const apexSheet: Pt2 = [
    placement.tx + apex2[0] * scale,
    placement.ty - apex2[1] * scale,
  ];
  // Point each direction AWAY from the apex, toward its edge's far end,
  // so the arc lands inside the physical corner rather than opposite it.
  const away = (r: { p: readonly [number, number]; d: readonly [number, number] }) => {
    const far = Math.hypot(r.p[0] - apex2[0], r.p[1] - apex2[1]) >
      Math.hypot(r.p[0] + r.d[0] - apex2[0], r.p[1] + r.d[1] - apex2[1])
      ? [-r.d[0], -r.d[1]]
      : [r.d[0], r.d[1]];
    // Sheet y is down: flip y so the drawn angle matches the sheet.
    return Math.atan2(-far[1], far[0]);
  };
  const a0 = away(A);
  let a1 = away(B);
  // Normalise to the SHORT sweep — an angular dimension states the
  // included angle, and the arc must agree with the number printed.
  let sweep = a1 - a0;
  while (sweep <= -Math.PI) sweep += 2 * Math.PI;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  a1 = a0 + sweep;
  const idx = nextIndex(view, 'arc');
  return angularDimensionToSvg({
    apex: apexSheet,
    startAngle: a0,
    endAngle: a1,
    radius: ANGULAR_RADIUS + idx * DIM_STEP + extra,
    label: a.text ? esc(a.text) : `${formatDimValue(Math.abs(sweep) * 180 / Math.PI)}°`,
  });
}

/** One leader note anchored at an explicit point / query. */
function noteAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'note' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, role, extra, nextIndex, toSheet } = ctx;
  const target = toSheet(resolveAnchor(parts, a.at, `${role}.at`));
  return leaderNoteToSvg({
    target,
    angle: LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
    text: esc(a.text),
    stemExtra: extra,
  });
}

/** One `hole` callout with its feature-aware label. */
function holeAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'hole' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, scale, role, extra, nextIndex, toSheet } = ctx;
  const edge = oneEdge(parts, a.edge, role);
  const { center, radius } = circleOf(edge, role);
  const label = a.text ? esc(a.text) : holeLabel(a, radius * 2, role);
  return radialDimensionToSvg({
    kind: 'diameter',
    center: toSheet(center),
    radius: radius * scale,
    angle: LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
    label,
    stemExtra: extra,
  });
}

/** One `fillet` radius callout. */
function filletAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'fillet' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, scale, role, extra, nextIndex, toSheet } = ctx;
  const edge = oneEdge(parts, a.edge, role);
  const { center, radius } = circleOf(edge, role);
  const label = a.text ? esc(a.text) : `R${formatDimValue(radius)}`;
  return radialDimensionToSvg({
    kind: 'radius',
    center: toSheet(center),
    radius: radius * scale,
    angle: LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
    label,
    stemExtra: extra,
  });
}

/** One `chamfer` note with its size × angle label. */
function chamferAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'chamfer' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, role, extra, nextIndex, toSheet } = ctx;
  const edge = oneEdge(parts, a.edge, role);
  const target = toSheet(edgeMid(edge));
  const angleDeg = a.angleDeg ?? 45;
  const label = a.text
    ? esc(a.text)
    : `${formatDimValue(a.size)} × ${formatDimValue(angleDeg)}°`;
  return leaderNoteToSvg({
    target,
    angle: LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
    text: label,
    stemExtra: extra,
  });
}

/** One datum-feature symbol on a resolved face. */
function datumAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'datum' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, role, extra, nextIndex, toSheet } = ctx;
  const faceMatch = oneFaceCoded(parts, a.face, role, 'drawing.datum.unresolved');
  const c = faceMatch.center;
  const target = toSheet([c.x, c.y, c.z]);
  return datumSymbolToSvg(
    target,
    LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
    a.label,
    extra,
  );
}

/** One feature-control frame, anchored to exactly one of edge / face. */
function fcfAnnotationSvg(
  a: Extract<DrawingAnnotation, { kind: 'fcf' }>,
  ctx: AnnotationRenderContext,
): string {
  const { parts, view, role, extra, nextIndex, toSheet } = ctx;
  if ((a.edge === undefined) === (a.face === undefined)) {
    fail(`${role}: an 'fcf' annotation needs exactly one of 'edge' or 'face'`);
  }
  const anchor: Vec3 = a.edge
    ? edgeMid(oneEdgeCoded(parts, a.edge, role, 'drawing.tolerance.feature-unresolved'))
    : (() => {
        const fc = oneFaceCoded(parts, a.face as FaceQuery, role, 'drawing.tolerance.feature-unresolved').center;
        return [fc.x, fc.y, fc.z] as Vec3;
      })();
  const target = toSheet(anchor);
  const cells = fcfCells(a);
  return fcfToSvg(
    target,
    LEADER_BASE_ANGLE + nextIndex(view, 'leader') * LEADER_STEP_ANGLE,
    cells,
    extra,
    ` data-kc-fcf="${escAttr(cells.join(' '))}"`,
  );
}

function renderAnnotationSvg(a: DrawingAnnotation, ctx: AnnotationRenderContext): string {
  switch (a.kind) {
    case 'linear':
      return linearAnnotationSvg(a, ctx);

    case 'radius':
    case 'diameter':
      return radialAnnotationSvg(a, ctx);

    case 'angular':
      return angularAnnotationSvg(a, ctx);

    case 'note':
      return noteAnnotationSvg(a, ctx);

    case 'hole':
      return holeAnnotationSvg(a, ctx);

    case 'fillet':
      return filletAnnotationSvg(a, ctx);

    case 'chamfer':
      return chamferAnnotationSvg(a, ctx);

    case 'datum':
      return datumAnnotationSvg(a, ctx);

    case 'fcf':
      return fcfAnnotationSvg(a, ctx);
  }
}

/**
 * Stacking rule (deterministic, geometry-independent):
 *
 * Annotations are bucketed by (view, side). A `linear` dimension whose
 * projected span is wider than it is tall is drawn BELOW its view; otherwise
 * it is drawn to the RIGHT of it. Angular dimensions bucket as `arc`, leader
 * kinds as `leader`. Within a bucket, the Nth annotation *in author order*
 * steps one `DIM_STEP` further out (linear), one `DIM_STEP` larger in arc
 * radius (angular), or one `LEADER_STEP_ANGLE` further round (leaders).
 *
 * Order therefore depends only on how the author wrote them, never on model
 * coordinates — reordering the model cannot reshuffle the sheet.
 */
export function renderAnnotations(input: AnnotationRenderInput): AnnotationRenderResult {
  const { parts, annotations, placements, scale } = input;
  const svg: string[] = [];
  const failures: string[] = [];
  const codedFailures: UnresolvedWithCode[] = [];
  const stack = new Map<string, number>();
  const bottomReserve: Record<DrawingViewName, number> = {
    front: 0, top: 0, left: 0, iso: 0,
  };
  const rightReserve: Record<DrawingViewName, number> = {
    front: 0, top: 0, left: 0, iso: 0,
  };

  const nextIndex = (view: DrawingViewName, side: string): number => {
    const key = `${view}:${side}`;
    const i = stack.get(key) ?? 0;
    stack.set(key, i + 1);
    return i;
  };

  annotations.forEach((a, i) => {
    const view = a.view ?? 'front';
    const placement = placements[view];
    const role = describe(a, i);
    if (!placement) {
      failures.push(`${role}: unknown view '${view}' (expected front | top | left | iso)`);
      return;
    }
    const toSheet = (p: Vec3): Pt2 => modelToSheet(p, view, placement, scale);
    const extra = a.offset ?? 0;

    const ctx: AnnotationRenderContext = {
      parts,
      view,
      placement,
      scale,
      role,
      extra,
      nextIndex,
      bottomReserve,
      rightReserve,
      toSheet,
    };

    try {
      svg.push(renderAnnotationSvg(a, ctx));
    } catch (e) {
      if (e instanceof UnresolvedWithCode) codedFailures.push(e);
      else if (e instanceof Unresolved) failures.push(e.message);
      else throw e;
    }
  });

  if (codedFailures.length > 0) {
    // Coded failures (datum / fcf) get their own diagnostic codes so an agent's
    // recovery hint names the right introspection tool; group by code so one
    // KernelError still names every failure of that code.
    const byCode = new Map<UnresolvedWithCode['code'], string[]>();
    for (const f of codedFailures) {
      const list = byCode.get(f.code) ?? [];
      list.push(f.message);
      byCode.set(f.code, list);
    }
    const [code, msgs] = [...byCode.entries()][0];
    throw new KernelError(
      code,
      `svg-drawing: ${msgs.length} annotation(s) could not be resolved:\n` +
        msgs.map(m => `  - ${m}`).join('\n'),
      undefined,
      'Every authored annotation must resolve, or the drawing would silently ' +
        'omit a callout. Tighten each query (inspect the model with ' +
        "inspect({ of: 'edges' }) or list_faces) or pass an explicit anchor.",
    );
  }

  if (failures.length > 0) {
    throw new KernelError(
      'feature.selection.no-match',
      `svg-drawing: ${failures.length} annotation(s) could not be resolved:\n` +
        failures.map(f => `  - ${f}`).join('\n'),
      undefined,
      'Every authored annotation must resolve, or the drawing would silently ' +
        'omit a dimension. Tighten each query (inspect the model with ' +
        "inspect({ of: 'edges' }) to see what is selectable) or pass an " +
        'explicit [x, y, z] anchor.',
    );
  }

  return { svg, bottomReserve, rightReserve, overlaps: detectLabelOverlaps(svg) };
}
