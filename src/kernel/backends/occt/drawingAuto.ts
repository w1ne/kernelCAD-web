// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto.ts
//
// Automatic dimensioning and GD&T for the `svg-drawing` sheet
// (`options.autoAnnotate`), plus rendering of GD&T declared on the feature
// graph (`shape.datum` / `shape.tolerance`).
//
// Rules (documented in the kernelcad-drawings skill):
//
//   Datum A  largest planar face. Faces within 1 % of the largest tie; ties
//            prefer the face whose outward normal is most opposite the
//            counterbore / countersink mouths (the face the part is bolted
//            down on), then −Z, −Y, −X.
//   Datum B  largest planar face orthogonal to A. When the part has holes,
//            only faces parallel to the dominant hole axis count (the faces a
//            hole pattern is located from). Ties prefer the face nearest a
//            hole axis, then −Y, −X, −Z.
//   Datum C  same rule, orthogonal to A and B.
//   Holes    grouped by identical composite (diameter, THRU / depth,
//            counterbore, countersink, axis): `4× ⌀6.5 THRU` with a position
//            frame `⌖ ⌀t A B C` stacked under it. t is the ISO 2768-1
//            permissible deviation of the class's finest range (f 0.05,
//            m 0.1, c 0.2).
//   Position hole centres dimensioned from the datum plane normal to each
//            in-view axis (baseline style), unique coordinates only.
//   Flatness on A: ISO 2768-2 straightness/flatness for the face's longest
//            side, class H / K / L for f / m / c.
//   Overall  width under the front view, height right of it, depth left of
//            the top view.
//   Radii    fillets and rounds grouped by radius per view: `4× R5`.
//   Chamfers grouped by legs per view: `4× 1 × 45°`.
//   Note     `ISO 2768-mK` in a general-tolerance cell beside the title block.
//
// Declarations override: a declared datum pins its letter to its face and the
// rules fill in the rest; a declared tolerance of type T on a feature replaces
// the automatic T on that feature (a hole group is one feature).
//
// Placement: linear dimensions stack on fixed free sides of each view. Leader
// callouts are placed greedily — every candidate (anchor × angle × stem) is
// rendered, its label boxes (the estimator `drawing.annotation.overlap` uses)
// are tested against drawn geometry, already-placed labels and leaders, view
// captions and the sheet frame, and the cheapest clean candidate wins. Whatever
// still collides is counted as overlapped in the report and named in a
// `drawing.annotation.overlap` warning.

import type { Edge, Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery } from './edgeQueries';
import { KernelError } from '../../../shared/intent/kernelError';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';
import type { EdgeQuery, FaceQuery } from '../../../shared/intent/queryTypes';
import {
  DATUM_LABEL_RE,
  type DrawingDatumDecl,
  type DrawingDeclarations,
  type DrawingToleranceDecl,
} from '../../../shared/intent/drawingGdtRecord';
import type { WorldFramePart } from './sceneToWorldFrame';
import { viewBasis } from './drawingProjection';
import {
  dimensionToSvg,
  formatDimValue,
  type DrawingViewName,
  type Polyline2,
  type Pt2,
  type SheetSpec,
  type ViewPlacement,
} from './drawingLayout';
import {
  DIM_BASE,
  DIM_STEP,
  FCF_CELL_H,
  datumBoxCentre,
  DATUM_BOX,
  datumSymbolToSvg,
  escAttr,
  extractTextBoxes,
  fcfCells,
  fcfFrameSvg,
  fcfFrameWidth,
  fcfToSvg,
  modelToSheet,
} from './drawingAnnotations';
import {
  canonicalAxis,
  circumcircle,
  cylinderAxisOf,
  principalAxis,
  recogniseDrawingFeatures,
  type ChamferFeature,
  type DrawingFeatureModel,
  type HoleComposite,
  type PlanarFaceInfo,
  type RadiusFeature,
  type V3,
} from './drawingFeatures';

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export type Iso2768Class = 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c';

export const AUTO_ANNOTATE_KINDS = [
  'datums',
  'flatness',
  'holes',
  'hole-positions',
  'overall',
  'fillets',
  'chamfers',
  'general-tolerance',
] as const;

export type AutoAnnotateKind = (typeof AUTO_ANNOTATE_KINDS)[number];

export interface AutoAnnotateOptions {
  /** General-tolerance class; default `'ISO2768-m'`. */
  tolerance?: Iso2768Class;
  /** `'auto'` (default) derives A/B/C; an array pins letters to faces and the
   *  rules derive whichever of A/B/C is left. */
  datums?: 'auto' | readonly DrawingDatumDecl[];
  /** Which annotation families to emit; default all. */
  include?: readonly AutoAnnotateKind[];
}

export interface DrawingReportAnnotation {
  kind: string;
  view: DrawingViewName;
  text: string;
  overlapped: boolean;
}

export interface DrawingReport {
  /** Annotations rendered clear of geometry, other labels and the frame. */
  placed: number;
  /** Annotations rendered but still colliding with something. */
  overlapped: number;
  byKind: Record<string, number>;
  datums: Array<{ label: string; source: 'auto' | 'declared'; normal: V3 | null; point: V3 }>;
  annotations: DrawingReportAnnotation[];
  /** Title-block general-tolerance note, e.g. `ISO 2768-mK`. */
  generalTolerance?: string;
}

export interface AutoDrawingInput {
  parts: readonly WorldFramePart[];
  compound: OcctBackend;
  autoAnnotate: boolean | AutoAnnotateOptions | undefined;
  declarations: DrawingDeclarations;
  /** Datums `options.annotations` already draws — they constrain the rules
   *  but are not drawn again. */
  authoredDatums: readonly DrawingDatumDecl[];
  /** Authored annotation SVG fragments, whose labels are obstacles. */
  authoredSvg: readonly string[];
  views: Record<DrawingViewName, { placement: ViewPlacement; polylines: readonly Polyline2[] }>;
  scale: number;
  sheet: SheetSpec;
  bottomReserve: Record<DrawingViewName, number>;
  rightReserve: Record<DrawingViewName, number>;
  /** Other sheet markup (section indicators) whose lines and labels are
   *  obstacles too. */
  extraObstacleSvg?: string;
}

export interface AutoDrawingResult {
  svg: string[];
  bottomReserve: Record<DrawingViewName, number>;
  generalTolerance?: string;
  report: DrawingReport;
  diagnostics: CompilerDiagnostic[];
}

// ---------------------------------------------------------------------------
// Option validation
// ---------------------------------------------------------------------------

const CLASSES: readonly Iso2768Class[] = ['ISO2768-f', 'ISO2768-m', 'ISO2768-c'];

interface NormalisedOptions {
  enabled: boolean;
  tolerance: Iso2768Class;
  include: Set<AutoAnnotateKind>;
  datums: DrawingDatumDecl[];
}

function invalid(field: string, why: string): never {
  throw new KernelError(
    'feature.invalid-args',
    `svg-drawing: options.autoAnnotate${field} ${why}.`,
    undefined,
    "Pass autoAnnotate: true, or { tolerance?: 'ISO2768-f' | 'ISO2768-m' | 'ISO2768-c', datums?: 'auto' | [{ label, face }], include?: [...] }.",
  );
}

export function normaliseAutoAnnotate(raw: boolean | AutoAnnotateOptions | undefined): NormalisedOptions {
  if (raw === undefined || raw === false) {
    return { enabled: false, tolerance: 'ISO2768-m', include: new Set(), datums: [] };
  }
  if (raw === true) {
    return { enabled: true, tolerance: 'ISO2768-m', include: new Set(AUTO_ANNOTATE_KINDS), datums: [] };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    invalid('', `must be true or an options object; got ${JSON.stringify(raw)}`);
  }
  const tolerance = raw.tolerance ?? 'ISO2768-m';
  if (!CLASSES.includes(tolerance)) {
    invalid('.tolerance', `must be one of ${CLASSES.join(' | ')}; got ${JSON.stringify(raw.tolerance)}`);
  }
  let include: Set<AutoAnnotateKind>;
  if (raw.include === undefined) {
    include = new Set(AUTO_ANNOTATE_KINDS);
  } else {
    if (!Array.isArray(raw.include)) invalid('.include', `must be an array; got ${JSON.stringify(raw.include)}`);
    for (const k of raw.include) {
      if (!(AUTO_ANNOTATE_KINDS as readonly string[]).includes(k)) {
        invalid('.include', `entries must be one of ${AUTO_ANNOTATE_KINDS.join(' | ')}; got ${JSON.stringify(k)}`);
      }
    }
    include = new Set(raw.include);
  }
  const datums: DrawingDatumDecl[] = [];
  if (raw.datums !== undefined && raw.datums !== 'auto') {
    if (!Array.isArray(raw.datums)) {
      invalid('.datums', `must be 'auto' or an array of { label, face }; got ${JSON.stringify(raw.datums)}`);
    }
    for (const [i, d] of raw.datums.entries()) {
      if (typeof d !== 'object' || d === null || typeof d.label !== 'string' || !DATUM_LABEL_RE.test(d.label)) {
        invalid(`.datums[${i}].label`, `must be one or two capital letters other than I, O and Q; got ${JSON.stringify(d?.label)}`);
      }
      if (typeof d.face !== 'object' || d.face === null || Array.isArray(d.face)) {
        invalid(`.datums[${i}].face`, `must be a FaceQuery object; got ${JSON.stringify(d.face)}`);
      }
      datums.push({ label: d.label, face: d.face });
    }
  }
  return { enabled: true, tolerance, include, datums };
}

// ---------------------------------------------------------------------------
// ISO 2768 tables
// ---------------------------------------------------------------------------

/** ISO 2768-1 permissible deviation for the finest range (0.5–3 mm). */
const POSITION_ZONE: Record<Iso2768Class, number> = {
  'ISO2768-f': 0.05,
  'ISO2768-m': 0.1,
  'ISO2768-c': 0.2,
};

/** ISO 2768-2 Table 1 straightness and flatness: [up to length, H, K, L]. */
const FLATNESS_TABLE: ReadonlyArray<readonly [number, number, number, number]> = [
  [10, 0.02, 0.05, 0.1],
  [30, 0.05, 0.1, 0.2],
  [100, 0.1, 0.2, 0.4],
  [300, 0.2, 0.4, 0.8],
  [1000, 0.3, 0.6, 1.2],
  [3000, 0.4, 0.8, 1.6],
];

const GEOMETRIC_CLASS: Record<Iso2768Class, { letter: 'H' | 'K' | 'L'; column: 1 | 2 | 3; linear: string }> = {
  'ISO2768-f': { letter: 'H', column: 1, linear: 'f' },
  'ISO2768-m': { letter: 'K', column: 2, linear: 'm' },
  'ISO2768-c': { letter: 'L', column: 3, linear: 'c' },
};

export function flatnessFor(cls: Iso2768Class, longestSide: number): number {
  const col = GEOMETRIC_CLASS[cls].column;
  const row = FLATNESS_TABLE.find(r => longestSide <= r[0]) ?? FLATNESS_TABLE[FLATNESS_TABLE.length - 1];
  return row[col];
}

export function generalToleranceNote(cls: Iso2768Class): string {
  const g = GEOMETRIC_CLASS[cls];
  return `ISO 2768-${g.linear}${g.letter}`;
}

// ---------------------------------------------------------------------------
// Vector + view helpers
// ---------------------------------------------------------------------------

const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: readonly number[], b: readonly number[]): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: readonly number[], b: readonly number[]): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: readonly number[]): number => Math.hypot(a[0], a[1], a[2]);
const round3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6;
const tidy = (v: readonly number[]): V3 => [r6(v[0]) + 0, r6(v[1]) + 0, r6(v[2]) + 0];

const STANDARD_VIEWS: readonly DrawingViewName[] = ['front', 'top', 'left'];

function viewDirection(view: DrawingViewName): V3 {
  const b = viewBasis(view);
  return cross(b.x, b.y);
}

/** The standard view looking along `axis` (a hole or arc axis). */
function viewAlong(axis: readonly number[]): DrawingViewName {
  let best: DrawingViewName = 'front';
  let bestDot = -1;
  for (const v of STANDARD_VIEWS) {
    const d = Math.abs(dot(viewDirection(v), axis));
    if (d > bestDot + 1e-9) { bestDot = d; best = v; }
  }
  return best;
}

interface EdgeLine { view: DrawingViewName; a: V3; b: V3; normal: V3 }

/** The standard views where a planar face is seen edge-on, longest trace
 *  first, each with that trace as a model-space segment. */
function edgeOnLines(face: PlanarFaceInfo): EdgeLine[] {
  const out: Array<EdgeLine & { length: number }> = [];
  for (const v of STANDARD_VIEWS) {
    if (Math.abs(dot(viewDirection(v), face.normal)) > 0.02) continue;
    const b = viewBasis(v);
    // In-plane trace direction: the view's screen axis that lies in the face.
    const along = Math.abs(dot(b.x, face.normal)) < Math.abs(dot(b.y, face.normal)) ? b.x : b.y;
    const corners: V3[] = [];
    for (const x of [face.min[0], face.max[0]]) {
      for (const y of [face.min[1], face.max[1]]) {
        for (const z of [face.min[2], face.max[2]]) corners.push([x, y, z]);
      }
    }
    const ts = corners.map(c => dot(c, along));
    const t0 = Math.min(...ts);
    const t1 = Math.max(...ts);
    const base = sub(face.centre, [along[0] * dot(face.centre, along), along[1] * dot(face.centre, along), along[2] * dot(face.centre, along)]);
    out.push({
      view: v,
      a: [base[0] + along[0] * t0, base[1] + along[1] * t0, base[2] + along[2] * t0],
      b: [base[0] + along[0] * t1, base[1] + along[1] * t1, base[2] + along[2] * t1],
      normal: face.normal,
      length: t1 - t0,
    });
  }
  return out
    .sort((p, q) => q.length - p.length || STANDARD_VIEWS.indexOf(p.view) - STANDARD_VIEWS.indexOf(q.view))
    .map(({ view, a, b, normal }) => ({ view, a, b, normal }));
}

// ---------------------------------------------------------------------------
// Placement: obstacles and costs
// ---------------------------------------------------------------------------

interface Box { x0: number; y0: number; x1: number; y1: number }
type Seg = readonly [number, number, number, number];

const CELL = 4;

class Obstacles {
  private readonly grid = new Map<string, Array<{ seg: Seg; owner: number }>>();
  private readonly boxes: Array<{ box: Box; owner: number }> = [];
  private readonly allowed: Box;

  constructor(allowed: Box) {
    this.allowed = allowed;
  }

  addSegment(seg: Seg, owner: number): void {
    const [x0, y0, x1, y1] = seg;
    const cx0 = Math.floor(Math.min(x0, x1) / CELL);
    const cx1 = Math.floor(Math.max(x0, x1) / CELL);
    const cy0 = Math.floor(Math.min(y0, y1) / CELL);
    const cy1 = Math.floor(Math.max(y0, y1) / CELL);
    for (let i = cx0; i <= cx1; i++) {
      for (let j = cy0; j <= cy1; j++) {
        const key = `${i},${j}`;
        const list = this.grid.get(key);
        if (list) list.push({ seg, owner });
        else this.grid.set(key, [{ seg, owner }]);
      }
    }
  }

  addBox(box: Box, owner: number): void {
    this.boxes.push({ box, owner });
  }

  /** Geometry lines a leader segment crosses (ignoring its first 1.5 mm,
   *  where it touches the feature it points at). */
  crossings(seg: Seg): number {
    const [x0, y0, x1, y1] = seg;
    const l = Math.hypot(x1 - x0, y1 - y0);
    if (l < 1.6) return 0;
    const k = 1.5 / l;
    const s: Seg = [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, x1, y1];
    const seen = new Set<Seg>();
    let n = 0;
    for (let i = Math.floor(Math.min(s[0], s[2]) / CELL); i <= Math.floor(Math.max(s[0], s[2]) / CELL); i++) {
      for (let j = Math.floor(Math.min(s[1], s[3]) / CELL); j <= Math.floor(Math.max(s[1], s[3]) / CELL); j++) {
        for (const o of this.grid.get(`${i},${j}`) ?? []) {
          if (o.owner !== GEOMETRY_OWNER || seen.has(o.seg)) continue;
          seen.add(o.seg);
          if (segmentsCross(s, o.seg)) n++;
        }
      }
    }
    return n;
  }

  /** Labels (not geometry) a leader segment runs through, other than its own. */
  labelHits(seg: Seg, owner: number): number {
    let n = 0;
    for (const o of this.boxes) {
      if (o.owner === owner || o.owner === GEOMETRY_OWNER) continue;
      if (segmentHitsBox(seg, o.box)) n++;
    }
    return n;
  }

  /** Collision cost of `boxes` owned by `owner` (its own items are ignored).
   *  Boxes are padded so a label never sits flush against a line. */
  cost(raw: readonly Box[], owner: number): number {
    let total = 0;
    const boxes = raw.map(b => ({ x0: b.x0 - PAD, y0: b.y0 - PAD, x1: b.x1 + PAD, y1: b.y1 + PAD }));
    for (const b of boxes) {
      const area = (b.x1 - b.x0) * (b.y1 - b.y0);
      const ix = Math.max(0, Math.min(b.x1, this.allowed.x1) - Math.max(b.x0, this.allowed.x0));
      const iy = Math.max(0, Math.min(b.y1, this.allowed.y1) - Math.max(b.y0, this.allowed.y0));
      total += area - ix * iy;
      for (const o of this.boxes) {
        if (o.owner === owner) continue;
        const ox = Math.min(b.x1, o.box.x1) - Math.max(b.x0, o.box.x0);
        const oy = Math.min(b.y1, o.box.y1) - Math.max(b.y0, o.box.y0);
        if (ox > 0 && oy > 0) total += ox * oy + 1;
      }
      const seen = new Set<Seg>();
      for (let i = Math.floor(b.x0 / CELL); i <= Math.floor(b.x1 / CELL); i++) {
        for (let j = Math.floor(b.y0 / CELL); j <= Math.floor(b.y1 / CELL); j++) {
          for (const s of this.grid.get(`${i},${j}`) ?? []) {
            if (s.owner === owner || seen.has(s.seg)) continue;
            seen.add(s.seg);
            if (segmentHitsBox(s.seg, b)) total += 2;
          }
        }
      }
    }
    return total;
  }
}

const PAD = 0.6;
const GEOMETRY_OWNER = -1;

function segmentsCross(a: Seg, b: Seg): boolean {
  const d = (p: readonly number[], q: readonly number[], r: readonly number[]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const p1 = [a[0], a[1]], p2 = [a[2], a[3]], q1 = [b[0], b[1]], q2 = [b[2], b[3]];
  const d1 = d(q1, q2, p1), d2 = d(q1, q2, p2), d3 = d(p1, p2, q1), d4 = d(p1, p2, q2);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

function segmentHitsBox(seg: Seg, b: Box): boolean {
  const [x0, y0, x1, y1] = seg;
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, x0 - b.x0) && clip(dx, b.x1 - x0) && clip(-dy, y0 - b.y0) && clip(dy, b.y1 - y0) && t0 <= t1;
}

const TEXT_H = 3.2;
const CHAR_W = 0.62;

function textBox(x: number, y: number, size: number, anchor: 'start' | 'middle' | 'end', text: string): Box {
  const w = Math.max(text.length, 1) * size * CHAR_W;
  const h = size * 1.15;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return { x0: left, y0: y - h * 0.8, x1: left + w, y1: y + h * 0.25 };
}

function arrowheadSvg(tip: Pt2, dx: number, dy: number): string {
  const L = 2.6;
  const W = 0.45;
  const bx = tip[0] - dx * L;
  const by = tip[1] - dy * L;
  return (
    `<path d="M ${round3(tip[0])} ${round3(tip[1])} L ${round3(bx - dy * W)} ${round3(by + dx * W)} ` +
    `L ${round3(bx + dy * W)} ${round3(by - dx * W)} Z" fill="#000" stroke="none"/>`
  );
}

interface Rendered {
  svg: string;
  boxes: Box[];
  segments: Seg[];
}

const LAND = 3;

/** A leader with a horizontal shoulder, a label past the shoulder, and
 *  optional feature-control-frame rows stacked under the label. */
function leaderCallout(
  tip: Pt2,
  angle: number,
  stem: number,
  label: string,
  rows: readonly string[][],
  groupOpen: string,
  arrow: boolean,
): Rendered {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const ex = tip[0] + ux * stem;
  const ey = tip[1] + uy * stem;
  const dir = ux >= 0 ? 1 : -1;
  const sx = ex + dir * LAND;
  const tx = sx + dir * 0.8;
  const ty = ey + 1.1;
  const anchor = dir === 1 ? 'start' : 'end';
  const boxes: Box[] = [textBox(tx, ty, TEXT_H, anchor, label)];
  const parts: string[] = [
    `<line x1="${round3(tip[0])}" y1="${round3(tip[1])}" x2="${round3(ex)}" y2="${round3(ey)}"/>`,
    `<line x1="${round3(ex)}" y1="${round3(ey)}" x2="${round3(sx)}" y2="${round3(ey)}"/>`,
  ];
  if (arrow) parts.push(arrowheadSvg(tip, -ux, -uy));
  parts.push(
    `<text x="${round3(tx)}" y="${round3(ty)}" font-size="${TEXT_H}" text-anchor="${anchor}" ` +
    `fill="#000" stroke="none">${escAttr(label)}</text>`,
  );
  rows.forEach((cells, k) => {
    const w = fcfFrameWidth(cells);
    const x = dir === 1 ? tx : tx - w;
    const top = ey + 2.4 + k * FCF_CELL_H;
    parts.push(
      `<g class="dim fcf" data-kc-fcf="${escAttr(cells.join(' '))}">${fcfFrameSvg(x, top, cells)}</g>`,
    );
    boxes.push({ x0: x, y0: top, x1: x + w, y1: top + FCF_CELL_H });
  });
  return {
    svg: `${groupOpen}${parts.join('')}</g>`,
    boxes,
    segments: [[tip[0], tip[1], ex, ey], [ex, ey, sx, ey]],
  };
}

/** Angles (sheet radians, y down) ordered by closeness to `preferred`,
 *  skipping near-vertical leaders whose shoulders read badly. */
function orderedAngles(preferred: number): number[] {
  const out: Array<{ a: number; d: number }> = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    if (Math.abs(Math.cos(a)) < 0.3) continue;
    let d = Math.abs(a - preferred) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    out.push({ a: a > Math.PI ? a - 2 * Math.PI : a, d });
  }
  return out.sort((p, q) => p.d - q.d || p.a - q.a).map(x => x.a);
}

const STEMS = [6, 10, 15, 21, 28, 36];

// ---------------------------------------------------------------------------
// Query resolution for declarations
// ---------------------------------------------------------------------------

function resolvePooled<Q, R>(
  parts: readonly WorldFramePart[],
  query: Q,
  resolve: (shape: OcctBackend, q: Q) => R[],
): R[] {
  const out: R[] = [];
  for (const p of parts) {
    try {
      out.push(...resolve(p.shape as OcctBackend, query));
    } catch {
      // A key one part's topology cannot answer is not a sheet-level error;
      // the zero-match check below is the gate.
    }
  }
  return out;
}

function oneFace(
  parts: readonly WorldFramePart[],
  q: FaceQuery,
  role: string,
  code: 'drawing.datum.unresolved' | 'drawing.tolerance.feature-unresolved',
): Face {
  const m = resolvePooled(parts, q, resolveFaceQuery);
  if (m.length === 1 || (m.length > 1 && q.near !== undefined)) return m[0];
  throw new KernelError(
    code,
    `svg-drawing: ${role}: ${m.length === 0 ? 'no face matched' : `${m.length} faces matched`} ${JSON.stringify(q)}` +
      (m.length > 1 ? " — add 'near' or a tighter query" : ''),
    undefined,
    'Every declared datum and tolerance must resolve to exactly one face or edge of the exported geometry. ' +
      'Inspect it with list_faces / list_edges, then tighten the query or add near.',
  );
}

function oneEdge(parts: readonly WorldFramePart[], q: EdgeQuery, role: string): Edge {
  const m = resolvePooled(parts, q, resolveEdgeQuery);
  if (m.length === 1 || (m.length > 1 && q.near !== undefined)) return m[0];
  throw new KernelError(
    'drawing.tolerance.feature-unresolved',
    `svg-drawing: ${role}: ${m.length === 0 ? 'no edge matched' : `${m.length} edges matched`} ${JSON.stringify(q)}` +
      (m.length > 1 ? " — add 'near' or a tighter query" : ''),
    undefined,
    'Every declared tolerance must resolve to exactly one face or edge of the exported geometry. ' +
      'Inspect it with list_edges, then tighten the query or add near.',
  );
}

function matchPlanar(face: Face, planar: readonly PlanarFaceInfo[]): PlanarFaceInfo | null {
  if ((face as unknown as { geomType?: string }).geomType !== 'PLANE') return null;
  const n = face.normalAt();
  const nl = Math.hypot(n.x, n.y, n.z) || 1;
  const c = face.center;
  return planar.find(p =>
    dot(p.normal, [n.x / nl, n.y / nl, n.z / nl]) > 0.9999 &&
    len(sub(p.centre, [c.x, c.y, c.z])) < 1e-3) ?? null;
}

// ---------------------------------------------------------------------------
// Datums
// ---------------------------------------------------------------------------

interface Datum {
  label: string;
  source: 'auto' | 'declared';
  plane: PlanarFaceInfo | null;
  point: V3;
  normal: V3 | null;
  draw: boolean;
}

const A_PREF: readonly V3[] = [[0, 0, -1], [0, -1, 0], [-1, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0]];
const BC_PREF: readonly V3[] = [[0, -1, 0], [-1, 0, 0], [0, 0, -1], [0, 1, 0], [1, 0, 0], [0, 0, 1]];

function prefIndex(n: V3, prefs: readonly V3[]): number {
  const i = prefs.findIndex(p => dot(p, n) > 0.999);
  return i === -1 ? prefs.length : i;
}

function lexCentre(a: PlanarFaceInfo, b: PlanarFaceInfo): number {
  return a.centre[0] - b.centre[0] || a.centre[1] - b.centre[1] || a.centre[2] - b.centre[2];
}

/** Dominant hole axis: the canonical axis carrying the most holes. */
function dominantHoleAxis(holes: readonly HoleComposite[]): V3 | null {
  const counts: Array<{ axis: V3; n: number }> = [];
  for (const h of holes) {
    const a = canonicalAxis(h.axis);
    const e = counts.find(c => Math.abs(dot(c.axis, a)) > 0.9999);
    if (e) e.n++;
    else counts.push({ axis: a, n: 1 });
  }
  if (counts.length === 0) return null;
  const zyx = (a: V3) => (Math.abs(a[2]) > 0.9999 ? 0 : Math.abs(a[1]) > 0.9999 ? 1 : Math.abs(a[0]) > 0.9999 ? 2 : 3);
  return counts.sort((p, q) => q.n - p.n || zyx(p.axis) - zyx(q.axis))[0].axis;
}

function deriveDatums(
  model: DrawingFeatureModel,
  fixed: Map<string, Datum>,
): { datums: Map<string, Datum>; missing: Array<{ label: string; why: string }> } {
  const datums = new Map(fixed);
  const missing: Array<{ label: string; why: string }> = [];
  const used = new Set<number>([...fixed.values()].map(d => d.plane?.index ?? -1));
  const mouths = model.holes
    .filter(h => h.counterbore || h.countersink)
    .map(h => [-h.axis[0], -h.axis[1], -h.axis[2]] as V3);
  const holeAxis = dominantHoleAxis(model.holes);

  for (const label of ['A', 'B', 'C'] as const) {
    if (datums.has(label)) continue;
    const priors = (label === 'A' ? [] : label === 'B' ? ['A'] : ['A', 'B'])
      .map(l => datums.get(l));
    if (priors.some(p => p === undefined)) {
      missing.push({ label, why: `datum ${label === 'B' ? 'A' : 'A and B'} must exist first` });
      continue;
    }
    const priorNormals = priors.map(p => p!.normal).filter((n): n is V3 => n !== null);
    let candidates = model.planar.filter(p =>
      !used.has(p.index) && priorNormals.every(n => Math.abs(dot(n, p.normal)) < 0.02));
    if (label !== 'A' && holeAxis !== null) {
      const locating = candidates.filter(p => Math.abs(dot(p.normal, holeAxis)) < 0.02);
      if (locating.length > 0) candidates = locating;
    }
    if (candidates.length === 0) {
      missing.push({
        label,
        why: model.planar.length === 0
          ? 'the part has no planar faces'
          : label === 'A' ? 'no unused planar face' : `no planar face is orthogonal to datum ${label === 'B' ? 'A' : 'A and B'}`,
      });
      continue;
    }
    const maxArea = Math.max(...candidates.map(c => c.area));
    const tied = candidates.filter(c => c.area >= maxArea * 0.99);
    let chosen: PlanarFaceInfo;
    if (label === 'A') {
      const mouthScore = (p: PlanarFaceInfo) =>
        mouths.length === 0 ? 0 : Math.round(mouths.reduce((s, m) => s + dot(p.normal, m), 0) / mouths.length * 1000);
      chosen = [...tied].sort((p, q) =>
        mouthScore(p) - mouthScore(q) ||
        prefIndex(p.normal, A_PREF) - prefIndex(q.normal, A_PREF) ||
        q.area - p.area || lexCentre(p, q))[0];
    } else {
      const holeDist = (p: PlanarFaceInfo) => {
        if (holeAxis === null) return 0;
        const ds = model.holes
          .filter(h => Math.abs(dot(canonicalAxis(h.axis), holeAxis)) > 0.9999)
          .map(h => Math.abs(dot(p.normal, h.entry) - p.offset));
        return ds.length === 0 ? 0 : Math.round(Math.min(...ds) * 100);
      };
      chosen = [...tied].sort((p, q) =>
        holeDist(p) - holeDist(q) ||
        prefIndex(p.normal, BC_PREF) - prefIndex(q.normal, BC_PREF) ||
        q.area - p.area || lexCentre(p, q))[0];
    }
    used.add(chosen.index);
    datums.set(label, {
      label, source: 'auto', plane: chosen, point: chosen.centre, normal: chosen.normal, draw: true,
    });
  }
  return { datums, missing };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

interface LinearItem {
  kind: 'hole-position' | 'overall';
  view: DrawingViewName;
  side: 'top' | 'bottom' | 'left' | 'right';
  from: Pt2;
  to: Pt2;
  label: string;
  order: number;
}

interface PlacedItem {
  kind: string;
  view: DrawingViewName;
  text: string;
  svg: string;
  boxes: Box[];
  owner: number;
}

const HOLE_SIDES: Record<DrawingViewName, { horizontal: 'top' | 'bottom'; vertical: 'left' | 'right' }> = {
  top: { horizontal: 'top', vertical: 'left' },
  front: { horizontal: 'bottom', vertical: 'right' },
  left: { horizontal: 'bottom', vertical: 'left' },
  iso: { horizontal: 'bottom', vertical: 'right' },
};

function holeLabel(h: HoleComposite, count: number): string {
  let s = `⌀${formatDimValue(h.diameter)}`;
  s += h.through ? ' THRU' : ` ▾ ${formatDimValue(h.depth ?? 0)}`;
  if (h.counterbore) s += ` ⌴⌀${formatDimValue(h.counterbore.diameter)} ▾ ${formatDimValue(h.counterbore.depth)}`;
  if (h.countersink) s += ` ⌵⌀${formatDimValue(h.countersink.diameter)} × ${formatDimValue(h.countersink.angleDeg)}°`;
  return count > 1 ? `${count}× ${s}` : s;
}

function holeKey(h: HoleComposite): string {
  const f = (n: number | undefined) => (n === undefined ? '-' : formatDimValue(n));
  const a = canonicalAxis(h.axis).map(v => Math.round(v * 1000)).join(',');
  return [
    a, f(h.diameter), h.through ? 'T' : f(h.depth),
    f(h.counterbore?.diameter), f(h.counterbore?.depth),
    f(h.countersink?.diameter), f(h.countersink?.angleDeg),
  ].join('|');
}

interface ResolvedTolerance {
  decl: DrawingToleranceDecl;
  index: number;
  /** Axis-type features (circular edge, cylindrical face). */
  axis?: { point: V3; dir: V3 };
  plane?: PlanarFaceInfo | null;
  target: V3;
  view: DrawingViewName;
  edgeLine?: EdgeLine | null;
}

export function renderAutoDrawing(input: AutoDrawingInput): AutoDrawingResult {
  const opts = normaliseAutoAnnotate(input.autoAnnotate);
  const { parts, declarations, views, scale, sheet } = input;
  const include = opts.include;
  const diagnostics: CompilerDiagnostic[] = [];
  const svg: string[] = [];
  const bottomReserve = { ...input.bottomReserve };
  const byKind: Record<string, number> = {};
  const annotations: DrawingReportAnnotation[] = [];

  const model = recogniseDrawingFeatures(input.compound, {
    holes: opts.enabled && (include.has('holes') || include.has('hole-positions') || include.has('datums')),
    radii: opts.enabled && include.has('fillets'),
    chamfers: opts.enabled && include.has('chamfers'),
  });

  // --- datums ------------------------------------------------------------
  const fixed = new Map<string, Datum>();
  const declare = (d: DrawingDatumDecl, draw: boolean, role: string) => {
    const face = oneFace(parts, d.face, role, 'drawing.datum.unresolved');
    const plane = matchPlanar(face, model.planar);
    const c = face.center;
    const n = plane?.normal ?? null;
    const prev = fixed.get(d.label);
    if (prev) {
      if (len(sub(prev.point, [c.x, c.y, c.z])) < 1e-3) {
        if (draw && !prev.draw) return; // already drawn by options.annotations
        if (!draw) prev.draw = false;
        return;
      }
      throw new KernelError(
        'feature.invalid-args',
        `svg-drawing: datum '${d.label}' is declared on two different faces (${role} and an earlier declaration).`,
        undefined,
        'Declare each datum letter once — in options.annotations, options.autoAnnotate.datums, or shape.datum().',
      );
    }
    fixed.set(d.label, {
      label: d.label, source: 'declared', plane, point: [c.x, c.y, c.z], normal: n, draw,
    });
  };
  input.authoredDatums.forEach((d, i) => declare(d, false, `annotations datum '${d.label}' (#${i})`));
  opts.datums.forEach((d, i) => declare(d, true, `autoAnnotate.datums[${i}]`));
  declarations.datums.forEach(d => declare(d, true, `datum('${d.label}')`));

  let datums = fixed;
  if (opts.enabled && include.has('datums')) {
    const derived = deriveDatums(model, fixed);
    datums = derived.datums;
    if (derived.missing.length > 0) {
      diagnostics.push({
        target: 'export-occt',
        code: 'drawing.auto.datum-ambiguous',
        severity: 'warn',
        message:
          `svg-drawing autoAnnotate could not establish datum${derived.missing.length > 1 ? 's' : ''} ` +
          derived.missing.map(m => `${m.label} (${m.why})`).join(', ') +
          '. Tolerances reference only the datums that exist.',
        hint: "Declare the missing datum with shape.datum('<letter>', faceQuery) or options.autoAnnotate.datums.",
        nextAction: NEXT_ACTIONS['drawing.auto.datum-ambiguous'],
      });
    }
  }
  const frameDatums = ['A', 'B', 'C'].filter(l => datums.has(l));

  // --- declared tolerances ----------------------------------------------
  const resolvedTols: ResolvedTolerance[] = declarations.tolerances.map((decl, index) => {
    const role = `tolerance(${decl.type}) #${index}`;
    if (decl.edge) {
      const edge = oneEdge(parts, decl.edge, role);
      const mid = edge.pointAt(0.5);
      const target: V3 = [mid.x, mid.y, mid.z];
      if ((edge as unknown as { geomType?: string }).geomType === 'CIRCLE') {
        const p = (t: number): V3 => { const q = edge.pointAt(t); return [q.x, q.y, q.z]; };
        const circle = circumcircle(p(0), p(1 / 3), p(2 / 3));
        if (circle) {
          return { decl, index, axis: { point: circle.centre, dir: circle.normal }, target, view: viewAlong(circle.normal) };
        }
      }
      return { decl, index, target, view: 'front' as DrawingViewName };
    }
    const face = oneFace(parts, decl.face!, role, 'drawing.tolerance.feature-unresolved');
    const type = (face as unknown as { geomType?: string }).geomType;
    if (type === 'PLANE') {
      const plane = matchPlanar(face, model.planar);
      const line = plane ? (edgeOnLines(plane)[0] ?? null) : null;
      const c = face.center;
      return {
        decl, index, plane, edgeLine: line, target: [c.x, c.y, c.z],
        view: line?.view ?? 'front',
      };
    }
    if (type === 'CYLINDRE') {
      const cyl = cylinderAxisOf(face);
      const p = face.pointOnSurface(0.5, 0.5);
      if (cyl) {
        return { decl, index, axis: { point: cyl.loc, dir: cyl.dir }, target: [p.x, p.y, p.z], view: viewAlong(cyl.dir) };
      }
    }
    const c = face.center;
    return { decl, index, target: [c.x, c.y, c.z], view: 'front' as DrawingViewName };
  });
  const consumedTols = new Set<number>();

  // --- obstacles ----------------------------------------------------------
  const margin = sheet.margin;
  const obstacles = new Obstacles({
    x0: margin + 1,
    y0: margin + 1,
    x1: sheet.w - margin - 1,
    y1: sheet.h - margin - sheet.titleBlock.h - 1,
  });
  const GEOMETRY = GEOMETRY_OWNER;
  for (const name of [...STANDARD_VIEWS, 'iso'] as DrawingViewName[]) {
    const { placement, polylines } = views[name];
    for (const pl of polylines) {
      for (let k = 0; k + 1 < pl.length; k++) {
        obstacles.addSegment([
          placement.tx + pl[k][0] * scale, placement.ty - pl[k][1] * scale,
          placement.tx + pl[k + 1][0] * scale, placement.ty - pl[k + 1][1] * scale,
        ], GEOMETRY);
      }
    }
  }
  const AUTHORED = -2;
  const foreign = [...input.authoredSvg, input.extraObstacleSvg ?? ''];
  for (const b of foreign.flatMap((s, i) => extractTextBoxes(s, i))) {
    obstacles.addBox({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }, AUTHORED);
  }
  for (const fragment of foreign) {
    for (const m of fragment.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"\/>/g)) {
      obstacles.addSegment([Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])], AUTHORED);
    }
  }

  const placed: PlacedItem[] = [];
  let ownerSeq = 0;
  const commit = (kind: string, view: DrawingViewName, text: string, r: Rendered): void => {
    const owner = ownerSeq++;
    for (const s of r.segments) obstacles.addSegment(s, owner);
    for (const b of r.boxes) obstacles.addBox(b, owner);
    placed.push({ kind, view, text, svg: r.svg, boxes: r.boxes, owner });
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  };

  const toSheet = (p: V3, view: DrawingViewName): Pt2 => modelToSheet(p, view, views[view].placement, scale);

  // --- hole groups ----------------------------------------------------------
  interface HoleGroup { key: string; holes: HoleComposite[]; view: DrawingViewName; rows: string[][]; label: string }
  const holeGroups: HoleGroup[] = [];
  {
    for (const h of model.holes) {
      const key = holeKey(h);
      const g = holeGroups.find(x => x.key === key);
      if (g) g.holes.push(h);
      else holeGroups.push({ key, holes: [h], view: viewAlong(h.axis), rows: [], label: '' });
    }
  }
  for (const g of holeGroups) {
    g.label = holeLabel(g.holes[0], g.holes.length);
    const matched = resolvedTols.filter(t => t.axis && g.holes.some(h =>
      Math.abs(dot(t.axis!.dir, h.axis)) > 0.9999 &&
      len(cross(sub(h.entry, t.axis!.point), t.axis!.dir)) < 0.05));
    const declaredTypes = new Set(matched.map(t => t.decl.type));
    if (opts.enabled && include.has('holes') && !declaredTypes.has('position')) {
      g.rows.push(fcfCells({ type: 'position', value: POSITION_ZONE[opts.tolerance], modifier: '⌀', datums: frameDatums }));
    }
    if (opts.enabled && include.has('holes')) {
      for (const t of matched) {
        g.rows.push(fcfCells(t.decl));
        consumedTols.add(t.index);
      }
    }
  }

  // --- linear dimensions ----------------------------------------------------
  const linear: LinearItem[] = [];
  const bb = input.compound.boundingBox();
  if (opts.enabled && include.has('hole-positions')) {
    const byView = new Map<DrawingViewName, HoleComposite[]>();
    for (const g of holeGroups) {
      if (principalAxis(g.holes[0].axis) === null) continue;
      byView.set(g.view, [...(byView.get(g.view) ?? []), ...g.holes]);
    }
    for (const [view, holes] of byView) {
      const b = viewBasis(view);
      for (const screen of ['x', 'y'] as const) {
        const w = screen === 'x' ? b.x : b.y;
        const axisIdx = Math.abs(w[0]) > 0.5 ? 0 : Math.abs(w[1]) > 0.5 ? 1 : 2;
        const datum = [...datums.values()].find(d => d.plane && Math.abs(d.normal![axisIdx]) > 0.999);
        const ref = datum ? datum.point[axisIdx] : bb.min[axisIdx];
        const coords: number[] = [];
        for (const h of holes) {
          const c = h.entry[axisIdx];
          if (Math.abs(c - ref) < 0.01) continue;
          if (!coords.some(x => Math.abs(x - c) < 0.01)) coords.push(c);
        }
        const side = screen === 'x' ? HOLE_SIDES[view].horizontal : HOLE_SIDES[view].vertical;
        const box = views[view].placement.box;
        for (const c of coords) {
          const hole = holes.find(h => Math.abs(h.entry[axisIdx] - c) < 0.01)!;
          const to = toSheet(hole.entry, view);
          // Reference point: on the datum plane at the hole's in-view position,
          // pushed to the view outline nearest the dimension line.
          const refPoint: V3 = [...hole.entry] as V3;
          refPoint[axisIdx] = ref;
          const from = toSheet(refPoint, view);
          const fromPt: Pt2 = screen === 'x'
            ? [from[0], side === 'top' ? box.y : box.y + box.h]
            : [side === 'left' ? box.x : box.x + box.w, from[1]];
          linear.push({
            kind: 'hole-position', view, side, from: fromPt, to,
            label: formatDimValue(Math.abs(c - ref)), order: Math.abs(c - ref),
          });
        }
      }
    }
  }
  if (opts.enabled && include.has('overall')) {
    const f = views.front.placement.box;
    const t = views.top.placement.box;
    linear.push(
      { kind: 'overall', view: 'front', side: 'bottom', from: [f.x, f.y + f.h], to: [f.x + f.w, f.y + f.h], label: formatDimValue(bb.max[0] - bb.min[0]), order: Infinity },
      { kind: 'overall', view: 'front', side: 'right', from: [f.x + f.w, f.y], to: [f.x + f.w, f.y + f.h], label: formatDimValue(bb.max[2] - bb.min[2]), order: Infinity },
      { kind: 'overall', view: 'top', side: 'left', from: [t.x, t.y], to: [t.x, t.y + t.h], label: formatDimValue(bb.max[1] - bb.min[1]), order: Infinity },
    );
  }
  const buckets = new Map<string, LinearItem[]>();
  for (const item of linear) {
    const k = `${item.view}:${item.side}`;
    buckets.set(k, [...(buckets.get(k) ?? []), item]);
  }
  for (const items of buckets.values()) {
    items.sort((p, q) => p.order - q.order);
    items.forEach((item, i) => {
      const box = views[item.view].placement.box;
      const reserve = item.side === 'bottom'
        ? input.bottomReserve[item.view]
        : item.side === 'right' ? input.rightReserve[item.view] : 0;
      const dist = (reserve > 0 ? reserve + DIM_STEP : DIM_BASE) + i * DIM_STEP;
      const horizontal = item.side === 'top' || item.side === 'bottom';
      const linePos = item.side === 'top' ? box.y - dist
        : item.side === 'bottom' ? box.y + box.h + dist
          : item.side === 'left' ? box.x - dist : box.x + box.w + dist;
      if (item.side === 'bottom') bottomReserve[item.view] = Math.max(bottomReserve[item.view], dist);
      const dimSvg = dimensionToSvg({
        kind: horizontal ? 'horizontal' : 'vertical',
        from: item.from,
        to: item.to,
        linePos,
        label: item.label,
      }).replace('<g class="dim"', `<g class="dim" data-kc-auto="${item.kind}"`);
      const boxes: Box[] = horizontal
        ? [textBox((item.from[0] + item.to[0]) / 2, linePos - 1, TEXT_H, 'middle', item.label)]
        : (() => {
            const w = Math.max(item.label.length, 1) * TEXT_H * CHAR_W;
            const cy = (item.from[1] + item.to[1]) / 2;
            return [{ x0: linePos - 1 - TEXT_H * 0.92, y0: cy - w / 2, x1: linePos - 1 + TEXT_H * 0.29, y1: cy + w / 2 }];
          })();
      const segments: Seg[] = horizontal
        ? [[item.from[0], linePos, item.to[0], linePos], [item.from[0], item.from[1], item.from[0], linePos], [item.to[0], item.to[1], item.to[0], linePos]]
        : [[linePos, item.from[1], linePos, item.to[1]], [item.from[0], item.from[1], linePos, item.from[1]], [item.to[0], item.to[1], linePos, item.to[1]]];
      commit(item.kind, item.view, item.label, { svg: dimSvg, boxes, segments });
    });
  }

  // View captions sit under each view, below whatever stacks there.
  const CAPTIONS: Record<DrawingViewName, string> = { front: 'FRONT', top: 'TOP', left: 'LEFT', iso: 'ISOMETRIC' };
  for (const name of [...STANDARD_VIEWS, 'iso'] as DrawingViewName[]) {
    const box = views[name].placement.box;
    obstacles.addBox(
      textBox(box.x + box.w / 2, box.y + box.h + 5 + bottomReserve[name], 2.6, 'middle', CAPTIONS[name]),
      GEOMETRY,
    );
  }

  // --- leader callouts ------------------------------------------------------
  // A label enclosed by a view's outline (geometry on all four sides) reads
  // as part of the part; prefer the free sheet around the views.
  const enclosed = (b: Box): boolean => {
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    for (const name of [...STANDARD_VIEWS, 'iso'] as DrawingViewName[]) {
      const vb = views[name].placement.box;
      if (cx < vb.x || cx > vb.x + vb.w || cy < vb.y || cy > vb.y + vb.h) continue;
      const rays: Seg[] = [
        [cx, cy, vb.x - 1, cy], [cx, cy, vb.x + vb.w + 1, cy],
        [cx, cy, cx, vb.y - 1], [cx, cy, cx, vb.y + vb.h + 1],
      ];
      return rays.every(ray => obstacles.crossings(ray) > 0);
    }
    return false;
  };

  const choose = (
    owner: number,
    candidates: ReadonlyArray<{ render: () => Rendered; penalty: number }>,
  ): { r: Rendered; cost: number; index: number } | null => {
    let best: { r: Rendered; cost: number; score: number; index: number } | null = null;
    for (const [index, c] of candidates.entries()) {
      const r = c.render();
      const cost = obstacles.cost(r.boxes, owner) +
        r.segments.reduce((n, seg) => n + obstacles.labelHits(seg, owner) * 5, 0);
      const crossings = r.segments.reduce((n, seg) => n + obstacles.crossings(seg), 0);
      const inside = r.boxes.length > 0 && enclosed(r.boxes[0]) ? 25 : 0;
      const score = cost * 1000 + c.penalty + crossings * 6 + inside;
      if (best === null || score < best.score) best = { r, cost, score, index };
      if (cost === 0 && c.penalty === 0 && crossings === 0 && inside === 0) break;
    }
    return best;
  };

  const outwardAngle = (p: Pt2, view: DrawingViewName): number => {
    const box = views[view].placement.box;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    return Math.hypot(dx, dy) < 1e-6 ? -Math.PI / 4 : Math.atan2(dy, dx);
  };

  // Hole callouts first: the largest labels need the most room.
  if (opts.enabled && include.has('holes')) {
    for (const g of holeGroups) {
      const view = g.view;
      if (principalAxis(g.holes[0].axis) === null) continue;
      const owner = ownerSeq;
      const reps = g.holes
        .map(h => ({ h, p: toSheet(h.entry, view) }))
        .sort((p, q) => {
          const box = views[view].placement.box;
          const d = (x: Pt2) => Math.hypot(x[0] - (box.x + box.w / 2), x[1] - (box.y + box.h / 2));
          return d(q.p) - d(p.p);
        });
      const radius = (g.holes[0].counterbore?.diameter ?? g.holes[0].countersink?.diameter ?? g.holes[0].diameter) / 2 * scale;
      const candidates: Array<{ render: () => Rendered; penalty: number }> = [];
      reps.forEach((rep, ri) => {
        orderedAngles(outwardAngle(rep.p, view)).forEach((angle, ai) => {
          STEMS.forEach(stem => {
            candidates.push({
              penalty: stem + ai * 4 + ri * 2,
              render: () => leaderCallout(
                [rep.p[0] + Math.cos(angle) * radius, rep.p[1] + Math.sin(angle) * radius],
                angle, stem, g.label, g.rows,
                `<g class="dim hole-callout" data-kc-auto="hole" data-kc-count="${g.holes.length}" fill="none" stroke="#000" stroke-width="0.18">`,
                true,
              ),
            });
          });
        });
      });
      const best = choose(owner, candidates);
      if (best) commit('hole', view, [g.label, ...g.rows.map(r => r.join(' '))].join(' | '), best.r);
    }
  }

  // Datum feature symbols.
  const datumLines = new Map<string, EdgeLine>();
  for (const label of [...datums.keys()].sort()) {
    const d = datums.get(label)!;
    if (!d.draw) continue;
    const lines = d.plane ? edgeOnLines(d.plane) : [];
    const owner = ownerSeq;
    const candidates: Array<{ render: () => Rendered; penalty: number; view: DrawingViewName }> = [];
    const attrs = ` data-kc-auto="datum" data-kc-datum="${escAttr(label)}"`;
    if (lines.length > 0) {
      lines.forEach((line, li) => {
        const a = toSheet(line.a, line.view);
        const b = toSheet(line.b, line.view);
        const basis = viewBasis(line.view);
        const angle = Math.atan2(-dot(line.normal, basis.y), dot(line.normal, basis.x));
        [0.5, 0.35, 0.65, 0.2, 0.8].forEach((f, fi) => {
          const tip: Pt2 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          [5, 9, 13, 18, 24, 30].forEach(stem => {
            candidates.push({
              view: line.view,
              penalty: stem + fi * 3 + li * 12,
              render: () => datumRendered(tip, angle, label, stem, attrs),
            });
          });
        });
      });
    } else {
      const tip = toSheet(d.point, 'front');
      orderedAngles(-Math.PI / 4).forEach((angle, ai) => {
        [5, 9, 13, 18, 24].forEach(stem => {
          candidates.push({ view: 'front', penalty: stem + ai * 3, render: () => datumRendered(tip, angle, label, stem, attrs) });
        });
      });
    }
    const best = choose(owner, candidates);
    if (best) {
      const chosen = candidates[best.index];
      const line = lines.find(l => l.view === chosen.view);
      if (line) datumLines.set(label, line);
      commit('datum', chosen.view, `datum ${label}`, best.r);
    }
  }

  // Flatness on A (auto, or the declared flatness on A's face).
  const datumA = datums.get('A');
  if (datumA?.plane) {
    const declaredFlat = resolvedTols.find(t =>
      t.decl.type === 'flatness' && t.plane && t.plane.index === datumA.plane!.index);
    const aLines = edgeOnLines(datumA.plane);
    const preferred = datumLines.get('A');
    const lines = preferred ? [preferred, ...aLines.filter(l => l.view !== preferred.view)] : aLines;
    const wanted = declaredFlat !== undefined || (opts.enabled && include.has('flatness'));
    if (lines.length > 0 && wanted) {
      const p = datumA.plane;
      const longest = Math.max(p.max[0] - p.min[0], p.max[1] - p.min[1], p.max[2] - p.min[2]);
      const cells = declaredFlat
        ? fcfCells(declaredFlat.decl)
        : fcfCells({ type: 'flatness', value: flatnessFor(opts.tolerance, longest) });
      if (declaredFlat) consumedTols.add(declaredFlat.index);
      const owner = ownerSeq;
      const candidates = lines.flatMap((line, li) =>
        fcfLineCandidates(line, cells, 'flatness', toSheet).map(c => ({ ...c, penalty: c.penalty + li * 12, view: line.view })));
      const best = choose(owner, candidates);
      if (best) commit('flatness', candidates[best.index].view, cells.join(' '), best.r);
    }
  }

  // Radius and chamfer notes.
  if (opts.enabled && include.has('fillets')) {
    const groups = new Map<string, RadiusFeature[]>();
    for (const r of model.radii) {
      const k = `${viewAlong(r.axis)}|${formatDimValue(r.radius)}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    for (const [k, feats] of groups) {
      const view = k.split('|')[0] as DrawingViewName;
      const label = `${feats.length > 1 ? `${feats.length}× ` : ''}R${formatDimValue(feats[0].radius)}`;
      const targets = feats.flatMap(f => [f.arcPoint, ...f.samples]).map(p => toSheet(p, view));
      const candidates = noteCandidates(targets, label, 'fillet', view, outwardAngle);
      const best = choose(ownerSeq, candidates);
      if (best) commit('fillet', view, label, best.r);
    }
  }
  if (opts.enabled && include.has('chamfers')) {
    const groups = new Map<string, ChamferFeature[]>();
    for (const c of model.chamfers) {
      const k = `${viewAlong(c.edgeDir)}|${formatDimValue(c.legs[0])}|${formatDimValue(c.legs[1])}`;
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    for (const [k, feats] of groups) {
      const view = k.split('|')[0] as DrawingViewName;
      const [l0, l1] = feats[0].legs;
      const size = Math.abs(l0 - l1) < 0.01
        ? `${formatDimValue(l0)} × 45°`
        : `${formatDimValue(l0)} × ${formatDimValue(l1)}`;
      const label = `${feats.length > 1 ? `${feats.length}× ` : ''}${size}`;
      const targets = feats.map(f => toSheet(f.midPoint, view));
      const candidates = noteCandidates(targets, label, 'chamfer', view, outwardAngle);
      const best = choose(ownerSeq, candidates);
      if (best) commit('chamfer', view, label, best.r);
    }
  }

  // Declared tolerances no automatic feature absorbed: their own frames.
  for (const t of resolvedTols) {
    if (consumedTols.has(t.index)) continue;
    const cells = fcfCells(t.decl);
    let candidates: Array<{ render: () => Rendered; penalty: number }>;
    if (t.edgeLine) {
      candidates = fcfLineCandidates(t.edgeLine, cells, 'tolerance', toSheet);
    } else {
      const tip = toSheet(t.target, t.view);
      candidates = [];
      orderedAngles(outwardAngle(tip, t.view)).forEach((angle, ai) => {
        STEMS.forEach(stem => {
          candidates.push({
            penalty: stem + ai * 4,
            render: () => fcfRendered(tip, angle, cells, stem, 'tolerance'),
          });
        });
      });
    }
    const best = choose(ownerSeq, candidates);
    if (best) commit('tolerance', t.edgeLine?.view ?? t.view, cells.join(' '), best.r);
  }

  // --- unclassified holes -------------------------------------------------
  if (opts.enabled && include.has('holes') && model.unclassified.length > 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'drawing.auto.hole-unclassified',
      severity: 'warn',
      message:
        `svg-drawing autoAnnotate left ${model.unclassified.length} bore(s) without a callout: ` +
        model.unclassified
          .map(u => `⌀${formatDimValue(u.diameter)} at [${tidy(u.point).join(', ')}] along [${tidy(u.axis).join(', ')}] — ${u.reason}`)
          .join('; ') + '.',
      hint: 'Dimension each named bore with an options.annotations hole or diameter entry.',
      nextAction: NEXT_ACTIONS['drawing.auto.hole-unclassified'],
    });
  }

  // --- final collision pass -------------------------------------------------
  let overlapped = 0;
  const crowded: string[] = [];
  for (const item of placed) {
    const hit = obstacles.cost(item.boxes, item.owner) > 0;
    if (hit) {
      overlapped++;
      crowded.push(`${item.kind} '${item.text}' (${item.view})`);
    }
    annotations.push({ kind: item.kind, view: item.view, text: item.text, overlapped: hit });
    svg.push(item.svg);
  }
  if (crowded.length > 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'drawing.annotation.overlap',
      severity: 'warn',
      message:
        `svg-drawing: ${crowded.length} automatic annotation(s) could not be placed clear of geometry, ` +
        `other labels or the sheet frame: ${crowded.join(', ')}.`,
      hint: 'Use a larger sheet (a3), narrow options.autoAnnotate.include, or dimension the crowded features with options.annotations.',
      nextAction: NEXT_ACTIONS['drawing.annotation.overlap'],
    });
  }

  const generalTolerance = opts.enabled && include.has('general-tolerance')
    ? generalToleranceNote(opts.tolerance)
    : undefined;
  if (generalTolerance) byKind['general-tolerance'] = 1;

  return {
    svg,
    bottomReserve,
    ...(generalTolerance ? { generalTolerance } : {}),
    report: {
      placed: placed.length - overlapped,
      overlapped,
      byKind,
      datums: ['A', 'B', 'C', ...[...datums.keys()].filter(l => !['A', 'B', 'C'].includes(l)).sort()]
        .filter(l => datums.has(l))
        .map(l => {
          const d = datums.get(l)!;
          return { label: l, source: d.source, normal: d.normal ? tidy(d.normal) : null, point: tidy(d.point) };
        }),
      annotations,
      ...(generalTolerance ? { generalTolerance } : {}),
    },
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Candidate generators
// ---------------------------------------------------------------------------

function datumRendered(tip: Pt2, angle: number, label: string, stem: number, attrs: string): Rendered {
  const svgText = datumSymbolToSvg(tip, angle, label, stem - 6, attrs);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const ex = tip[0] + ux * stem;
  const ey = tip[1] + uy * stem;
  const { cx, cy } = datumBoxCentre(ex, ey, ux, uy);
  const half = DATUM_BOX / 2;
  return {
    svg: svgText,
    boxes: [{ x0: cx - half, y0: cy - half, x1: cx + half, y1: cy + half }],
    segments: [[tip[0], tip[1], ex, ey]],
  };
}

function fcfRendered(tip: Pt2, angle: number, cells: string[], stem: number, kind: string): Rendered {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const ex = tip[0] + ux * stem;
  const ey = tip[1] + uy * stem;
  const w = fcfFrameWidth(cells);
  const left = ux >= 0 ? ex : ex - w;
  return {
    svg: fcfToSvg(tip, angle, cells, stem - 7, ` data-kc-auto="${kind}" data-kc-fcf="${escAttr(cells.join(' '))}"`),
    boxes: [{ x0: left, y0: ey - FCF_CELL_H / 2, x1: left + w, y1: ey + FCF_CELL_H / 2 }],
    segments: [[tip[0], tip[1], ex, ey]],
  };
}

function fcfLineCandidates(
  line: EdgeLine,
  cells: string[],
  kind: string,
  toSheet: (p: V3, view: DrawingViewName) => Pt2,
): Array<{ render: () => Rendered; penalty: number }> {
  const a = toSheet(line.a, line.view);
  const b = toSheet(line.b, line.view);
  const basis = viewBasis(line.view);
  const normalAngle = Math.atan2(-dot(line.normal, basis.y), dot(line.normal, basis.x));
  const out: Array<{ render: () => Rendered; penalty: number }> = [];
  [0.75, 0.25, 0.9, 0.1, 0.6, 0.4].forEach((f, fi) => {
    const tip: Pt2 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    [0, Math.PI / 7, -Math.PI / 7, Math.PI / 4, -Math.PI / 4].forEach((da, ai) => {
      STEMS.forEach(stem => {
        out.push({
          penalty: stem + fi * 3 + ai * 4,
          render: () => fcfRendered(tip, normalAngle + da, cells, stem, kind),
        });
      });
    });
  });
  return out;
}

function noteCandidates(
  targets: readonly Pt2[],
  label: string,
  kind: string,
  view: DrawingViewName,
  outwardAngle: (p: Pt2, view: DrawingViewName) => number,
): Array<{ render: () => Rendered; penalty: number }> {
  const out: Array<{ render: () => Rendered; penalty: number }> = [];
  // Spread the anchor choice: a handful of distinct targets, most outward first.
  const unique: Pt2[] = [];
  for (const t of targets) {
    if (!unique.some(u => Math.hypot(u[0] - t[0], u[1] - t[1]) < 0.5)) unique.push(t);
  }
  const reps = unique.slice(0, 12);
  reps.forEach((tip, ri) => {
    orderedAngles(outwardAngle(tip, view)).slice(0, 8).forEach((angle, ai) => {
      STEMS.forEach(stem => {
        out.push({
          penalty: stem + ai * 4 + ri,
          render: () => leaderCallout(
            tip, angle, stem, label, [],
            `<g class="dim note" data-kc-auto="${kind}" fill="none" stroke="#000" stroke-width="0.18">`,
            true,
          ),
        });
      });
    });
  });
  return out;
}
