// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/reconstructSolver.ts
//
// Low-level support for drawing reconstruction: the fact ledger, per-axis
// level bookkeeping, the parameter registry, view geometry conversion, and the
// level solver (dimensions → symmetry → linework).

import type { AssumptionEvidenceSource, AssumptionFact, AssumptionKind } from '../vision/ledger';
import {
  asFullCircle,
  dist,
  outerBoundary,
  recoverArcs,
  type P2,
  type Seg2,
} from './geometry2d';
import { add, half, num, ref, sub, type Expr } from './expr';
import type { LinearDimension, SheetAnalysis } from './sheet';
import type { ParamDecl, PartModel, ViewCircle, ViewGeometry } from './reconstruct';
import { sheetToModel, type DrawingView, type ModelAxis, type OrthoViewName } from './views';

export const AXES: readonly ModelAxis[] = ['x', 'y', 'z'];
const EXTENT_NAMES: Record<ModelAxis, string> = { x: 'width', y: 'depth', z: 'height' };
const SIDES: Record<ModelAxis, [string, string]> = { x: ['left', 'right'], y: ['front', 'back'], z: ['bottom', 'top'] };
/** Which way along its normal each view looks from (+1: viewer on the positive side). */
export const VIEWER_SIDE: Record<OrthoViewName, 1 | -1> = { top: 1, bottom: -1, front: -1, left: -1, right: 1 };

export const round2 = (v: number): number => Math.round(v * 100) / 100;
const normalOf = (v: DrawingView): ModelAxis => AXES.find(a => a !== v.u.axis && a !== v.v.axis)!;

// ---------------------------------------------------------------------------
// Ledger helpers
// ---------------------------------------------------------------------------

export class FactBook {
  readonly facts: AssumptionFact[] = [];
  push(f: {
    id: string;
    statement: string;
    kind: AssumptionKind;
    source?: AssumptionEvidenceSource;
    region?: [number, number, number, number];
    value?: unknown;
    confidence: number;
    open?: boolean;
    disagreement?: AssumptionFact['disagreement'];
  }): void {
    this.facts.push({
      id: f.id,
      statement: f.statement,
      kind: f.kind,
      ...(f.source ? { evidence: { source: f.source, ...(f.region ? { region: f.region } : {}) } } : {}),
      ...(f.value !== undefined ? { value: f.value } : {}),
      confidence: f.confidence,
      resolution: f.open ? 'open' : 'confirmed',
      ...(f.disagreement ? { disagreement: f.disagreement } : {}),
    });
  }
}

export const textRegion = (d: { text: { x: number; y: number; sizeMm: number; widthMm: number } }): [number, number, number, number] => {
  const r = (n: number) => Math.round(n * 100) / 100;
  return [r(d.text.x), r(d.text.y - d.text.sizeMm), r(d.text.widthMm), r(d.text.sizeMm)];
};
// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

interface Level {
  measured: number;
  count: number;
  /** Index of the first hole whose centre sits on this level. */
  hole?: number;
  expr?: Expr;
}

export interface DimEdge {
  i: number;
  j: number;
  value: number;
  dim: LinearDimension;
  view: OrthoViewName;
  measured: number;
}

export class AxisLevels {
  readonly levels: Level[] = [];
  readonly axis: ModelAxis;
  readonly tol: number;
  constructor(axis: ModelAxis, tol: number) {
    this.axis = axis;
    this.tol = tol;
  }
  add(m: number, hole?: number): number {
    const i = this.find(m);
    if (i >= 0) {
      const l = this.levels[i];
      l.measured = (l.measured * l.count + m) / (l.count + 1);
      l.count++;
      if (hole !== undefined && (l.hole === undefined || hole < l.hole)) l.hole = hole;
      return i;
    }
    this.levels.push({ measured: m, count: 1, ...(hole !== undefined ? { hole } : {}) });
    return this.levels.length - 1;
  }
  find(m: number): number {
    let best = -1;
    let bestD = Infinity;
    this.levels.forEach((l, i) => {
      const d = Math.abs(l.measured - m);
      if (d <= this.tol && d < bestD) { best = i; bestD = d; }
    });
    return best;
  }
  get min(): number {
    return this.levels.reduce((b, l, i) => (l.measured < this.levels[b].measured ? i : b), 0);
  }
  get max(): number {
    return this.levels.reduce((b, l, i) => (l.measured > this.levels[b].measured ? i : b), 0);
  }
  /** Piecewise-linear map from measured coordinate to solved value. */
  snap(m: number): number {
    const pts = this.levels.filter(l => l.expr).map(l => [l.measured, l.expr!.v] as const).sort((a, b) => a[0] - b[0]);
    if (pts.length === 0) return m;
    if (m <= pts[0][0]) return pts[0][1] + (m - pts[0][0]);
    for (let k = 0; k + 1 < pts.length; k++) {
      const [m0, v0] = pts[k];
      const [m1, v1] = pts[k + 1];
      if (m <= m1) return m1 === m0 ? v0 : v0 + ((m - m0) / (m1 - m0)) * (v1 - v0);
    }
    const last = pts[pts.length - 1];
    return last[1] + (m - last[0]);
  }
}

export class ParamRegistry {
  readonly params: ParamDecl[] = [];
  private readonly used = new Set<string>();
  declare(base: string, value: number, description: string): Expr {
    let name = base;
    for (let n = 2; this.used.has(name); n++) name = `${base}${n}`;
    this.used.add(name);
    this.params.push({ name, value, description });
    return ref(name, value);
  }
}

// ---------------------------------------------------------------------------
// View geometry
// ---------------------------------------------------------------------------

export function buildViewGeometry(view: DrawingView, sheetPerModel: number, tolModel: number): ViewGeometry {
  const toModel = (p: P2): P2 => {
    const m = sheetToModel(view, p, sheetPerModel);
    return [m.u, m.v];
  };
  const circles: ViewCircle[] = [];
  const visibleSegs: Seg2[] = [];
  const hiddenSegs: Seg2[] = [];
  const centerSegs: Seg2[] = [];
  for (const p of view.paths) {
    const fit = p.cls === 'center' ? null : asFullCircle(p.points);
    if (fit) {
      const c = toModel([fit.cx, fit.cy]);
      const dup = circles.find(o => Math.hypot(o.u - c[0], o.v - c[1]) <= tolModel && Math.abs(o.r - fit.r / sheetPerModel) <= tolModel);
      if (dup) {
        if (dup.hidden && p.cls !== 'hidden') dup.hidden = false;
        continue;
      }
      circles.push({ view, u: c[0], v: c[1], r: fit.r / sheetPerModel, hidden: p.cls === 'hidden', sheet: { cx: fit.cx, cy: fit.cy, r: fit.r } });
      continue;
    }
    const target = p.cls === 'hidden' ? hiddenSegs : p.cls === 'center' ? centerSegs : visibleSegs;
    for (let i = 0; i + 1 < p.points.length; i++) {
      const a = toModel(p.points[i]);
      const b = toModel(p.points[i + 1]);
      if (dist(a, b) > 1e-6) target.push({ a, b });
    }
  }
  const outline = visibleSegs.length > 0 ? outerBoundary(visibleSegs, tolModel) : [];
  // Start the loop at its lowest-left vertex so emitted paths read from the origin.
  const elements = outline.length >= 3 ? recoverArcs(outline, Math.max(tolModel, 0.02)) : [];
  if (elements.length > 0) {
    let first = 0;
    elements.forEach((e, i) => {
      const f = elements[first].a;
      if (e.a[1] < f[1] - tolModel || (Math.abs(e.a[1] - f[1]) <= tolModel && e.a[0] < f[0])) first = i;
    });
    elements.push(...elements.splice(0, first));
  }
  return {
    view,
    outline,
    elements,
    circles,
    visibleSegs,
    hiddenSegs,
    centerSegs,
    extU: (view.bbox.x1 - view.bbox.x0) / sheetPerModel,
    extV: (view.bbox.y1 - view.bbox.y0) / sheetPerModel,
    normal: normalOf(view),
  };
}

export const coordOn = (g: ViewGeometry, axis: ModelAxis, p: { u: number; v: number } | P2): number | undefined => {
  const u = Array.isArray(p) ? p[0] : (p as { u: number }).u;
  const v = Array.isArray(p) ? p[1] : (p as { v: number }).v;
  if (g.view.u.axis === axis) return u;
  if (g.view.v.axis === axis) return v;
  return undefined;
};

export function isRectangle(g: ViewGeometry, tol: number): boolean {
  if (g.elements.some(e => e.bulge !== 0)) return false;
  if (g.outline.length !== 4) return false;
  return g.outline.every(([u, v]) => (Math.abs(u) <= tol || Math.abs(u - g.extU) <= tol) && (Math.abs(v) <= tol || Math.abs(v - g.extV) <= tol));
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

function extrudeAxisIsThinnest(axis: ModelAxis, kind: PartModel['kind'], normalAxis: ModelAxis, axisLevels: Record<ModelAxis, AxisLevels>): boolean {
  if (kind !== 'extrude' || axis !== normalAxis) return false;
  const ext = (x: ModelAxis) => { const l = axisLevels[x]; return l.levels.length ? l.levels[l.max].measured - l.levels[l.min].measured : Infinity; };
  return AXES.every(o => o === axis || ext(axis) <= 0.25 * ext(o));
}

/** Revolve axial spans: `length`, else a ranked `step`/`shoulder` name. */
function revolveLevelName(
  axis: ModelAxis,
  lo: number,
  hi: number,
  L: AxisLevels,
  kind: PartModel['kind'],
  axialAxis: ModelAxis,
  isMin: boolean,
  isMax: boolean,
): string | null {
  if (kind !== 'revolve' || axis !== axialAxis) return null;
  if (isMin && isMax) return 'length';
  const sorted = L.levels.map((l, i) => [l.measured, i] as const).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const rankHi = sorted.indexOf(hi);
  return sorted.indexOf(lo) === rankHi - 1 ? `step${rankHi}Length` : `shoulder${rankHi}Offset`;
}

/** Spans touching a hole centre take a `hole<n><axis>` family name. */
function holeLevelName(
  isMin: boolean,
  isMax: boolean,
  loHole: number | undefined,
  hiHole: number | undefined,
  A: string,
): string | null {
  if (hiHole !== undefined && isMin) return `hole${hiHole + 1}${A}`;
  if (loHole !== undefined && isMax) return `hole${loHole + 1}${A}FromEnd`;
  if (loHole !== undefined && hiHole !== undefined) return `hole${loHole + 1}To${hiHole + 1}${A}`;
  return null;
}

/** Remaining spans: side-relative `Thickness`/`Offset`, else `<axis>Step`. */
function relativeLevelName(
  axis: ModelAxis,
  lo: number,
  hi: number,
  L: AxisLevels,
  isMin: boolean,
  isMax: boolean,
): string {
  const ext = L.levels[L.max].measured - L.levels[L.min].measured;
  const span = Math.abs(L.levels[hi].measured - L.levels[lo].measured);
  const role = span <= 0.25 * ext ? 'Thickness' : 'Offset';
  if (isMin) return `${SIDES[axis][0]}${role}`;
  if (isMax) return `${SIDES[axis][1]}${role}`;
  return `${axis}Step`;
}

/** Name the parameter for a span between two levels. */
function levelNamer(
  axis: ModelAxis,
  lo: number,
  hi: number,
  axisLevels: Record<ModelAxis, AxisLevels>,
  kind: PartModel['kind'],
  normalAxis: ModelAxis,
  axialAxis: ModelAxis,
): string {
  const L = axisLevels[axis];
  const isMin = lo === L.min, isMax = hi === L.max;
  const loHole = L.levels[lo].hole, hiHole = L.levels[hi].hole;
  const A = axis.toUpperCase();
  const revolveName = revolveLevelName(axis, lo, hi, L, kind, axialAxis, isMin, isMax);
  if (revolveName !== null) return revolveName;
  if (isMin && isMax) return extrudeAxisIsThinnest(axis, kind, normalAxis, axisLevels) ? 'thickness' : EXTENT_NAMES[axis];
  const holeName = holeLevelName(isMin, isMax, loHole, hiHole, A);
  if (holeName !== null) return holeName;
  return relativeLevelName(axis, lo, hi, L, isMin, isMax);
}

/** Solve every axis level outward from the minimum, then by symmetry, then linework. */
export function solveAxisLevels(args: {
  axisLevels: Record<ModelAxis, AxisLevels>;
  edges: Record<ModelAxis, DimEdge[]>;
  kind: PartModel['kind'];
  normalAxis: ModelAxis;
  axialAxis: ModelAxis;
  toScale: number;
  disagreementTol: (v: number) => number;
  params: ParamRegistry;
  facts: FactBook;
}): void {
  const { axisLevels, edges, kind, normalAxis, axialAxis, toScale, disagreementTol, params, facts } = args;
  const namer = (axis: ModelAxis, lo: number, hi: number) => levelNamer(axis, lo, hi, axisLevels, kind, normalAxis, axialAxis);
  for (const axis of AXES) {
    const L = axisLevels[axis];
    if (L.levels.length === 0) continue;
    // A turned part is sized by its diameters; only the axial levels are solved.
    if (kind === 'revolve' && axis !== axialAxis) continue;
    solveOneAxis({ axis, L, edges: edges[axis], namer, toScale, disagreementTol, params, facts });
  }
}

/** Solve the levels of one axis: dimensions, then symmetry, then linework. */
function solveOneAxis(args: {
  axis: ModelAxis;
  L: AxisLevels;
  edges: readonly DimEdge[];
  namer: (axis: ModelAxis, lo: number, hi: number) => string;
  toScale: number;
  disagreementTol: (v: number) => number;
  params: ParamRegistry;
  facts: FactBook;
}): void {
  const { axis, L, edges, namer, toScale, disagreementTol, params, facts } = args;
  const root = L.min;
  L.levels[root].expr = num(0);
  const used = new Set<DimEdge>();
  const queue = [root];
  const assigned = () => L.levels.every(l => l.expr);
  for (let guard = 0; guard < L.levels.length * 4 + 8; guard++) {
    propagateDimensions({ axis, L, edges, used, queue, namer, disagreementTol, params, facts });
    if (assigned()) break;
    if (solveBySymmetry({ axis, L, root, queue, toScale, facts })) continue;
    if (!solveByLinework({ axis, L, root, queue, namer, toScale, params, facts })) break;
  }
}

/** Drain the queue, assigning levels reached by a lettered dimension. */
function propagateDimensions(args: {
  axis: ModelAxis;
  L: AxisLevels;
  edges: readonly DimEdge[];
  used: Set<DimEdge>;
  queue: number[];
  namer: (axis: ModelAxis, lo: number, hi: number) => string;
  disagreementTol: (v: number) => number;
  params: ParamRegistry;
  facts: FactBook;
}): void {
  const { axis, L, edges, used, queue, namer, disagreementTol, params, facts } = args;
  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const e of edges) {
      if (used.has(e) || (e.i !== p && e.j !== p)) continue;
      used.add(e);
      const q = e.i === p ? e.j : e.i;
      const lp = L.levels[p], lq = L.levels[q];
      const sign = lq.measured >= lp.measured ? 1 : -1;
      if (!lq.expr) {
        const lo = sign > 0 ? p : q, hi = sign > 0 ? q : p;
        const disagree = Math.abs(e.value - e.measured) > disagreementTol(e.value);
        const pe = params.declare(namer(axis, lo, hi), e.value, `${axis.toUpperCase()} span — dimension '${e.dim.text.text}' (${e.view} view)`);
        lq.expr = sign > 0 ? add(lp.expr!, pe) : sub(lp.expr!, pe);
        facts.push({
          id: (pe as { name: string }).name,
          statement: disagree
            ? `Dimension '${e.dim.text.text}' (${e.view} view) states ${e.value} mm; the linework it spans measures ${round2(e.measured)} mm at the sheet scale. The stated value is used.`
            : `${axis.toUpperCase()} span of ${e.value} mm stated by dimension '${e.dim.text.text}' (${e.view} view).`,
          kind: 'visible', source: 'dimension', region: textRegion(e.dim), value: e.value, confidence: 1, open: disagree,
          ...(disagree ? { disagreement: { stated: e.value, measured: round2(e.measured), unit: 'mm' as const } } : {}),
        });
        queue.push(q);
      } else {
        const implied = lp.expr!.v + sign * e.value;
        if (Math.abs(implied - lq.expr.v) > 0.01) {
          const chain = Math.abs(lq.expr.v - lp.expr!.v);
          facts.push({
            id: `conflict:${e.dim.text.text}`,
            statement: `Dimension '${e.dim.text.text}' (${e.view} view) states ${e.value} mm, but the other dimensions along ${axis.toUpperCase()} already fix that span at ${round2(chain)} mm. The chain value is used.`,
            kind: 'visible', source: 'dimension', region: textRegion(e.dim), value: e.value, confidence: 1, open: true,
            disagreement: { stated: e.value, measured: round2(chain), unit: 'mm' },
          });
        }
      }
    }
  }
}

/** Assign unset levels by mirror/centre symmetry about the solved extent. */
function solveBySymmetry(args: {
  axis: ModelAxis;
  L: AxisLevels;
  root: number;
  queue: number[];
  toScale: number;
  facts: FactBook;
}): boolean {
  const { axis, L, root, queue, toScale, facts } = args;
  let progressed = false;
  const maxL = L.levels[L.max];
  if (maxL.expr) {
    const ext = maxL.expr;
    const sorted = L.levels.map((_, i) => i).sort((a, b) => L.levels[a].measured - L.levels[b].measured);
    for (const k of sorted) {
      const lk = L.levels[k];
      if (lk.expr) continue;
      const mirror = L.find(L.levels[root].measured + maxL.measured - lk.measured);
      const centre = Math.abs(lk.measured - (L.levels[root].measured + maxL.measured) / 2) <= L.tol;
      if (mirror >= 0 && mirror !== k && L.levels[mirror].expr) {
        lk.expr = sub(ext, L.levels[mirror].expr!);
      } else if (centre) {
        lk.expr = half(ext);
      } else {
        continue;
      }
      progressed = true;
      queue.push(k);
      // Not a param: the script expresses this position through the
      // dimensioned one, so the fact is confirmed, or the script edited.
      const label = `symmetry:${lk.hole !== undefined ? `hole${lk.hole + 1}${axis.toUpperCase()}` : `${axis}${round2(lk.expr.v)}`}`;
      facts.push({
        id: label,
        statement: centre
          ? `${axis.toUpperCase()} = ${round2(lk.expr.v)} mm: centred on the part (symmetry about the stated extent; no dimension locates it).`
          : `${axis.toUpperCase()} = ${round2(lk.expr.v)} mm: mirror image of a dimensioned position about the part centre (symmetry; no dimension locates it).`,
        kind: 'inferred', source: 'symmetry', value: round2(lk.expr.v), confidence: toScale, open: true,
      });
    }
  }
  return progressed;
}

/** Measure the nearest unset level off the drawn linework. Returns false if none. */
function solveByLinework(args: {
  axis: ModelAxis;
  L: AxisLevels;
  root: number;
  queue: number[];
  namer: (axis: ModelAxis, lo: number, hi: number) => string;
  toScale: number;
  params: ParamRegistry;
  facts: FactBook;
}): boolean {
  const { axis, L, root, queue, namer, toScale, params, facts } = args;
  let pick = -1, from = -1, gap = Infinity;
  const maxL = L.levels[L.max];
  if (!maxL.expr) { pick = L.max; from = root; }
  else {
    L.levels.forEach((lk, k) => {
      if (lk.expr) return;
      L.levels.forEach((lp, p) => {
        if (!lp.expr) return;
        // Nearest assigned neighbour; on a tie, measure from the axis origin.
        const d = Math.abs(lk.measured - lp.measured) + (p === root ? 0 : L.tol);
        if (d < gap - 1e-9) { gap = d; pick = k; from = p; }
      });
    });
  }
  if (pick < 0) return false;
  const lk = L.levels[pick], lp = L.levels[from];
  const value = round2(Math.abs(lk.measured - lp.measured));
  const sign = lk.measured >= lp.measured ? 1 : -1;
  const lo = sign > 0 ? from : pick, hi = sign > 0 ? pick : from;
  const pe = params.declare(namer(axis, lo, hi), value, `${axis.toUpperCase()} span — measured from linework at the sheet scale (no dimension)`);
  lk.expr = sign > 0 ? add(lp.expr!, pe) : sub(lp.expr!, pe);
  facts.push({
    id: (pe as { name: string }).name,
    statement: `${axis.toUpperCase()} span of ${value} mm measured from the drawn linework at the sheet scale; no dimension states it.`,
    kind: 'inferred', source: 'linework', value, confidence: toScale, open: true,
  });
  queue.push(pick);
  return true;
}

/** Extent solved for an axis (0 when no level has an expression). */
export function levelExtent(L: AxisLevels): number {
  return L.levels.length ? L.levels[L.max].expr?.v ?? 0 : 0;
}


export function boxDistance(b: { x0: number; y0: number; x1: number; y1: number }, p: P2): number {
  const dx = Math.max(b.x0 - p[0], 0, p[0] - b.x1);
  const dy = Math.max(b.y0 - p[1], 0, p[1] - b.y1);
  return Math.hypot(dx, dy);
}

/** `THK 5`, `5 THK`, `THICKNESS 5`, `5 mm THK` → the stated extrusion depth. */
export function thicknessNote(sheet: SheetAnalysis, mmPerUnit: number): { value: number; text: string } | null {
  for (const t of sheet.notes) {
    const m = /^(?:(?:THK|THICKNESS)\.?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?|(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?(?:THK|THICK)\.?)$/i.exec(t.text.trim());
    if (m) return { value: Number((m[1] ?? m[2]).replace(',', '.')) * mmPerUnit, text: t.text };
  }
  return null;
}

/** Axial extent [lo, hi] of the hidden walls of `c` in another view along `axis`. */
export function hiddenSpan(geometry: readonly ViewGeometry[], host: ViewGeometry, c: ViewCircle, axis: ModelAxis, tol: number): [number, number] | null {
  for (const w of geometry) {
    if (w === host) continue;
    const alongU = w.view.u.axis === axis;
    const alongV = w.view.v.axis === axis;
    if (!alongU && !alongV) continue;
    const shared = alongU ? w.view.v.axis : w.view.u.axis;
    const centre = coordOn(host, shared, c);
    if (centre === undefined) continue;
    const walls = [centre - c.r, centre + c.r].map(pos => {
      let lo = Infinity, hi = -Infinity;
      for (const s of w.hiddenSegs) {
        const across = alongU ? [s.a[1], s.b[1]] : [s.a[0], s.b[0]];
        const along = alongU ? [s.a[0], s.b[0]] : [s.a[1], s.b[1]];
        if (Math.abs(across[0] - pos) > tol || Math.abs(across[1] - pos) > tol) continue;
        lo = Math.min(lo, ...along);
        hi = Math.max(hi, ...along);
      }
      return lo < hi ? [lo, hi] as const : null;
    });
    if (walls[0] && walls[1]) return [Math.min(walls[0][0], walls[1][0]), Math.max(walls[0][1], walls[1][1])];
  }
  return null;
}

/**
 * The half of a turned silhouette on the positive side of its axis, as
 * (radius, axial) points running from one axis crossing to the other.
 */
export function upperHalf(g: ViewGeometry, radialAxis: ModelAxis, axisPos: number, tol: number): Array<[number, number]> {
  const radialIsU = g.view.u.axis === radialAxis;
  const toRA = (p: P2): [number, number] => radialIsU ? [p[0] - axisPos, p[1]] : [p[1] - axisPos, p[0]];
  const pts = g.outline.map(toRA);
  // Insert the crossings of the axis.
  const withCross: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    withCross.push(p);
    if ((p[0] > tol && q[0] < -tol) || (p[0] < -tol && q[0] > tol)) {
      const t = p[0] / (p[0] - q[0]);
      withCross.push([0, p[1] + t * (q[1] - p[1])]);
    }
  }
  // Longest cyclic run with radius ≥ 0.
  const n = withCross.length;
  const start = withCross.findIndex(p => p[0] < -tol);
  if (start < 0) return [];
  let best: Array<[number, number]> = [];
  let run: Array<[number, number]> = [];
  for (let k = 1; k <= n; k++) {
    const p = withCross[(start + k) % n];
    if (p[0] >= -tol) run.push([Math.max(0, p[0]), p[1]]);
    else { if (run.length > best.length) best = run; run = []; }
  }
  if (run.length > best.length) best = run;
  return best;
}

export function dedupeLoop(pts: Array<{ at: [Expr, Expr]; bulge: number }>): Array<{ at: [Expr, Expr]; bulge: number }> {
  const out: typeof pts = [];
  for (const p of pts) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.at[0].v - p.at[0].v) < 1e-9 && Math.abs(prev.at[1].v - p.at[1].v) < 1e-9) continue;
    out.push(p);
  }
  if (out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if (Math.abs(a.at[0].v - b.at[0].v) < 1e-9 && Math.abs(a.at[1].v - b.at[1].v) < 1e-9) out.pop();
  }
  return out;
}
