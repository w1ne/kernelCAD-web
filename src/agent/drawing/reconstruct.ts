// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/reconstruct.ts
//
// Stages 4–5: turn identified views plus associated dimensions into a part
// model — an extruded profile or a revolved half-profile, plus holes — whose
// every coordinate is an expression over role-named params, and record how
// each value was established in assumption-ledger facts.
//
// LEVELS. Along each model axis, the distinct coordinates that matter
// (silhouette vertices, hole centres, from every view that shows the axis)
// are "levels". A linear dimension is a constraint between two levels. Levels
// are solved outward from the axis minimum (value 0):
//   1. dimension edges      → stated value wins            → `visible`
//   2. mirror / centre      → about the dimensioned extent → `inferred` (symmetry)
//   3. drawn distance       → linework at the sheet scale  → `inferred` (linework)
// Step 1 re-runs after every assignment, so a dimension hanging off a
// symmetric level still drives its neighbour. Where a stated value and the
// drawn distance disagree, the stated value is used and the fact carries a
// `disagreement` and stays open.

import type { AssumptionEvidenceSource, AssumptionFact, AssumptionKind } from '../vision/ledger';
import {
  asFullCircle,
  dist,
  outerBoundary,
  pointLine,
  recoverArcs,
  type LoopElement,
  type P2,
  type Seg2,
} from './geometry2d';
import { add, half, num, ref, sub, type Expr } from './expr';
import type { LinearDimension, RadialCallout, SheetAnalysis } from './sheet';
import { sheetToModel, type DrawingView, type ModelAxis, type OrthoViewName, type ViewSet } from './views';

export type DrawingIssueCode =
  | 'reference.drawing.view-ambiguous'
  | 'reference.drawing.dimension-unassociated'
  | 'reference.drawing.depth-missing';

export interface DrawingIssue {
  code: DrawingIssueCode;
  severity: 'warn' | 'error';
  message: string;
}

export interface ParamDecl {
  name: string;
  value: number;
  description: string;
}

export interface ViewCircle {
  view: DrawingView;
  u: number;
  v: number;
  r: number;
  hidden: boolean;
  sheet: { cx: number; cy: number; r: number };
  /** Diameter stated by an associated callout (mm). */
  statedDiameter?: number;
  callout?: RadialCallout;
}

export interface ViewGeometry {
  view: DrawingView;
  /** Counter-clockwise silhouette loop in view model coordinates (u, v). */
  outline: P2[];
  elements: LoopElement[];
  circles: ViewCircle[];
  visibleSegs: Seg2[];
  hiddenSegs: Seg2[];
  centerSegs: Seg2[];
  extU: number;
  extV: number;
  normal: ModelAxis;
}

export interface HoleModel {
  name: string;
  axis: ModelAxis;
  /** Centre coordinates on the two axes perpendicular to `axis`. */
  center: Partial<Record<ModelAxis, Expr>>;
  diameter: Expr;
  /** Start of the cutting cylinder along `axis`, and its length. */
  from: Expr;
  length: Expr;
  through: boolean;
}

export interface PartModel {
  kind: 'extrude' | 'revolve';
  profileView: OrthoViewName;
  /** Model axes carried by the path's x and y. */
  profileAxes: [ModelAxis, ModelAxis];
  /** Closed loop: each vertex with the bulge of the edge that leaves it. */
  loop: Array<{ at: [Expr, Expr]; bulge: number }>;
  extrudeAxis?: ModelAxis;
  depth?: Expr;
  revolveAxis?: ModelAxis;
  /** Largest radius, for placing a revolved body with its bbox at the origin. */
  maxRadius?: Expr;
  holes: HoleModel[];
  params: ParamDecl[];
  /** Solved overall extents per axis (mm). */
  extents: Record<ModelAxis, number>;
}

export interface ReconstructInput {
  sheet: SheetAnalysis;
  viewSet: ViewSet;
  /** Sheet mm per model mm. */
  sheetPerModel: number;
  /** Millimetres per lettered unit (1 for mm, 25.4 for inches). */
  mmPerUnit: number;
}

export interface ReconstructResult {
  model: PartModel | null;
  facts: AssumptionFact[];
  issues: DrawingIssue[];
  geometry: ViewGeometry[];
  /** Map a measured view coordinate onto the solved (dimension-snapped) value. */
  snap: (axis: ModelAxis, measured: number) => number;
}

const AXES: readonly ModelAxis[] = ['x', 'y', 'z'];
const EXTENT_NAMES: Record<ModelAxis, string> = { x: 'width', y: 'depth', z: 'height' };
const SIDES: Record<ModelAxis, [string, string]> = { x: ['left', 'right'], y: ['front', 'back'], z: ['bottom', 'top'] };
/** Which way along its normal each view looks from (+1: viewer on the positive side). */
const VIEWER_SIDE: Record<OrthoViewName, 1 | -1> = { top: 1, bottom: -1, front: -1, left: -1, right: 1 };

const round2 = (v: number): number => Math.round(v * 100) / 100;
const normalOf = (v: DrawingView): ModelAxis => AXES.find(a => a !== v.u.axis && a !== v.v.axis)!;

// ---------------------------------------------------------------------------
// Ledger helpers
// ---------------------------------------------------------------------------

class FactBook {
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

const textRegion = (d: { text: { x: number; y: number; sizeMm: number; widthMm: number } }): [number, number, number, number] => {
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

interface DimEdge {
  i: number;
  j: number;
  value: number;
  dim: LinearDimension;
  view: OrthoViewName;
  measured: number;
}

class AxisLevels {
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

class ParamRegistry {
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

function buildViewGeometry(view: DrawingView, sheetPerModel: number, tolModel: number): ViewGeometry {
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

const coordOn = (g: ViewGeometry, axis: ModelAxis, p: { u: number; v: number } | P2): number | undefined => {
  const u = Array.isArray(p) ? p[0] : (p as { u: number }).u;
  const v = Array.isArray(p) ? p[1] : (p as { v: number }).v;
  if (g.view.u.axis === axis) return u;
  if (g.view.v.axis === axis) return v;
  return undefined;
};

function isRectangle(g: ViewGeometry, tol: number): boolean {
  if (g.elements.some(e => e.bulge !== 0)) return false;
  if (g.outline.length !== 4) return false;
  return g.outline.every(([u, v]) => (Math.abs(u) <= tol || Math.abs(u - g.extU) <= tol) && (Math.abs(v) <= tol || Math.abs(v - g.extV) <= tol));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function reconstructPart(input: ReconstructInput): ReconstructResult {
  const { sheet, viewSet, sheetPerModel, mmPerUnit } = input;
  const facts = new FactBook();
  const issues: DrawingIssue[] = [];
  const params = new ParamRegistry();
  const tolModel = 0.08 / sheetPerModel;
  const geometry = viewSet.views.map(v => buildViewGeometry(v, sheetPerModel, tolModel));
  const noSnap = { model: null, facts: facts.facts, issues, geometry, snap: (_a: ModelAxis, m: number) => m };
  if (geometry.length === 0) return noSnap;

  // --- radial callouts → circles -------------------------------------------------
  for (const callout of sheet.radialCallouts) {
    if (callout.parsed.reference) continue;
    let best: { c: ViewCircle; err: number } | null = null;
    for (const g of geometry) {
      for (const c of g.circles) {
        const { cx, cy, r } = c.sheet;
        const rimErr = Math.min(...callout.tips.map(t => Math.abs(Math.hypot(t[0] - cx, t[1] - cy) - r)));
        if (rimErr > Math.max(0.15, 0.05 * r)) continue;
        if (callout.stem && pointLine([cx, cy], callout.stem[0], callout.stem[1]) > Math.max(0.3, 0.08 * r)) continue;
        if (!best || rimErr < best.err) best = { c, err: rimErr };
      }
    }
    const value = callout.parsed.value * mmPerUnit * (callout.parsed.kind === 'radius' ? 2 : 1);
    if (!best) {
      issues.push({
        code: 'reference.drawing.dimension-unassociated',
        severity: 'warn',
        message: `callout '${callout.text.text}' points at no circle in any view; its value was not applied.`,
      });
      facts.push({
        id: `unapplied:${callout.text.text}`,
        statement: `Callout '${callout.text.text}' could not be tied to a circle, so it did not drive the model.`,
        kind: 'visible', source: 'dimension', region: textRegion(callout), value, confidence: 1, open: true,
      });
      continue;
    }
    const target = best.c;
    const group = geometry
      .find(g => g.view === target.view)!.circles
      .filter(c => c.hidden === target.hidden && Math.abs(c.r - target.r) <= Math.max(tolModel, 0.02 * target.r));
    const members = callout.parsed.count > 1 ? group : [target];
    for (const c of members) {
      c.statedDiameter = value;
      c.callout = callout;
    }
    if (callout.parsed.count > 1 && group.length !== callout.parsed.count) {
      facts.push({
        id: `count:${callout.text.text}`,
        statement: `Callout '${callout.text.text}' states ${callout.parsed.count} features; ${group.length} matching circle(s) are drawn in the ${target.view.name} view.`,
        kind: 'visible', source: 'dimension', region: textRegion(callout), value: group.length, confidence: 1, open: true,
      });
    }
  }

  // --- part kind -----------------------------------------------------------------
  const endView = geometry.find(g =>
    g.circles.length > 0 &&
    g.visibleSegs.length === 0 &&
    g.circles.every(c => Math.hypot(c.u - g.circles[0].u, c.v - g.circles[0].v) <= tolModel * 3) &&
    geometry.some(o => o !== g && (o.view.u.axis === g.normal || o.view.v.axis === g.normal)),
  );

  // --- holes (numbering first: levels are named after them) -----------------------
  const holeCircles: ViewCircle[] = [];
  for (const g of geometry) {
    if (g === endView) continue;
    for (const c of g.circles) {
      const axis = g.normal;
      const cu = coordOn(g, g.view.u.axis, c)!;
      const cv = coordOn(g, g.view.v.axis, c)!;
      const dup = holeCircles.some(h => {
        const hg = geometry.find(x => x.view === h.view)!;
        if (hg.normal !== axis) return false;
        const hu = coordOn(hg, g.view.u.axis, h);
        const hv = coordOn(hg, g.view.v.axis, h);
        return hu !== undefined && hv !== undefined && Math.abs(hu - cu) <= tolModel && Math.abs(hv - cv) <= tolModel;
      });
      if (!dup) holeCircles.push(c);
    }
  }
  // Deterministic numbering: by view, callout-stated first (so a pattern's
  // names come from a stated member), then row-major from the view origin.
  const viewRank = (c: ViewCircle) => geometry.findIndex(g => g.view === c.view);
  holeCircles.sort((a, b) =>
    viewRank(a) - viewRank(b) ||
    Number(b.statedDiameter !== undefined) - Number(a.statedDiameter !== undefined) ||
    Math.round((a.v - b.v) / tolModel) ||
    a.u - b.u);

  // --- levels ----------------------------------------------------------------------
  const axisLevels: Record<ModelAxis, AxisLevels> = { x: new AxisLevels('x', tolModel), y: new AxisLevels('y', tolModel), z: new AxisLevels('z', tolModel) };
  for (const g of geometry) {
    for (const e of g.elements) {
      for (const p of [e.a, e.b]) {
        axisLevels[g.view.u.axis].add(p[0]);
        axisLevels[g.view.v.axis].add(p[1]);
      }
    }
    if (g === endView) {
      // The end view's circle centre is the axis position; its rims are the extents.
      const c = g.circles[0];
      const rMax = Math.max(...g.circles.map(k => k.r));
      axisLevels[g.view.u.axis].add(c.u - rMax);
      axisLevels[g.view.u.axis].add(c.u + rMax);
      axisLevels[g.view.v.axis].add(c.v - rMax);
      axisLevels[g.view.v.axis].add(c.v + rMax);
    }
  }
  holeCircles.forEach((c, k) => {
    const g = geometry.find(x => x.view === c.view)!;
    axisLevels[g.view.u.axis].add(c.u, k);
    axisLevels[g.view.v.axis].add(c.v, k);
  });

  // --- dimension edges ---------------------------------------------------------------
  const edges: Record<ModelAxis, DimEdge[]> = { x: [], y: [], z: [] };
  const diameterDims: Array<{ dim: LinearDimension; axis: ModelAxis; center: number; radius: number; measuredRadius: number; view: OrthoViewName }> = [];
  const disagreementTol = (v: number) => Math.max(0.1, 0.005 * v);
  for (const dim of sheet.linearDims) {
    if (dim.parsed.reference) continue;
    const horizontal = Math.abs(dim.dir[0]) >= 0.995;
    const vertical = Math.abs(dim.dir[1]) >= 0.995;
    const value = dim.parsed.value * mmPerUnit;
    const unapplied = (why: string) => {
      issues.push({ code: 'reference.drawing.dimension-unassociated', severity: 'warn', message: `dimension '${dim.text.text}' ${why}; its value was not applied.` });
      facts.push({
        id: `unapplied:${dim.text.text}`,
        statement: `Dimension '${dim.text.text}' ${why}, so it did not drive the model.`,
        kind: 'visible', source: 'dimension', region: textRegion(dim), value, confidence: 1, open: true,
      });
    };
    if (!horizontal && !vertical) { unapplied('is aligned to neither sheet axis'); continue; }
    let owner: ViewGeometry | null = null;
    let ownerDist = Infinity;
    for (const g of geometry) {
      const d = Math.max(...dim.feet.map(f => boxDistance(g.view.bbox, f)));
      if (d < ownerDist) { ownerDist = d; owner = g; }
    }
    if (!owner || ownerDist > 3) { unapplied('has extension lines that reach no view'); continue; }
    const map = horizontal ? owner.view.u : owner.view.v;
    const m0 = sheetToModel(owner.view, dim.feet[0], sheetPerModel)[horizontal ? 'u' : 'v'];
    const m1 = sheetToModel(owner.view, dim.feet[1], sheetPerModel)[horizontal ? 'u' : 'v'];
    if (dim.parsed.kind === 'diameter') {
      diameterDims.push({ dim, axis: map.axis, center: (m0 + m1) / 2, radius: value / 2, measuredRadius: Math.abs(m1 - m0) / 2, view: owner.view.name });
      continue;
    }
    const levels = axisLevels[map.axis];
    const i = levels.find(m0);
    const j = levels.find(m1);
    if (i < 0 || j < 0 || i === j) { unapplied(`measures a ${map.axis.toUpperCase()} span in the ${owner.view.name} view that ends on no modelled edge or hole centre`); continue; }
    edges[map.axis].push({ i, j, value, dim, view: owner.view.name, measured: Math.abs(levels.levels[j].measured - levels.levels[i].measured) });
  }

  // Linework-to-dimension agreement: the confidence behind every measured value.
  const allEdges = AXES.flatMap(a => edges[a]);
  const agreeing = allEdges.filter(e => Math.abs(e.value - e.measured) <= disagreementTol(e.value)).length;
  const toScale = allEdges.length === 0 ? 0 : round2(agreeing / allEdges.length);

  // --- choose reconstruction ------------------------------------------------------------
  let kind: PartModel['kind'];
  let profile: ViewGeometry;
  let normalAxis: ModelAxis;
  if (endView) {
    kind = 'revolve';
    normalAxis = endView.normal;
    const order: OrthoViewName[] = ['front', 'top', 'bottom', 'left', 'right'];
    profile = geometry
      .filter(g => g !== endView && (g.view.u.axis === normalAxis || g.view.v.axis === normalAxis) && g.outline.length >= 3)
      .sort((a, b) => order.indexOf(a.view.name) - order.indexOf(b.view.name))[0];
    if (!profile) {
      issues.push({ code: 'reference.drawing.view-ambiguous', severity: 'error', message: `the ${endView.view.name} view shows only concentric circles but no view shows the part along its axis.` });
      return noSnap;
    }
  } else {
    kind = 'extrude';
    const order: OrthoViewName[] = ['top', 'front', 'left', 'right', 'bottom'];
    const candidates = geometry.filter(g => g.outline.length >= 3);
    if (candidates.length === 0) {
      issues.push({ code: 'reference.drawing.view-ambiguous', severity: 'error', message: 'no view has a closed silhouette to use as a profile.' });
      return noSnap;
    }
    const score = (g: ViewGeometry) => (isRectangle(g, tolModel) ? 0 : 1000 + g.elements.length) + 10 * g.circles.length - order.indexOf(g.view.name);
    candidates.sort((a, b) => score(b) - score(a));
    profile = candidates[0];
    normalAxis = profile.normal;
    const others = candidates.slice(1).filter(g => !isRectangle(g, tolModel) && g.normal !== normalAxis);
    for (const o of others) {
      facts.push({
        id: `prism:${o.view.name}`,
        statement: `Rebuilt as the ${profile.view.name} profile extruded along ${normalAxis.toUpperCase()}; the ${o.view.name} view's silhouette is not a rectangle, so features seen only there are not reproduced.`,
        kind: 'assumed', source: 'default', confidence: 0, open: true,
      });
    }
  }

  // --- radial levels (revolve) ---------------------------------------------------------
  const R = kind === 'revolve' ? (profile.view.u.axis === normalAxis ? profile.view.v.axis : profile.view.u.axis) : null;
  const axialAxis = normalAxis;
  let axisPos = 0;
  const radial: Array<{ measured: number; expr?: Expr }> = [];
  let halfChain: Array<[number, number]> = []; // (radial, axial)
  if (kind === 'revolve' && R) {
    const ext = R === profile.view.u.axis ? profile.extU : profile.extV;
    axisPos = ext / 2;
    const drawnCenter = profile.centerSegs.find(s => {
      const along = R === profile.view.u.axis ? Math.abs(s.a[0] - s.b[0]) : Math.abs(s.a[1] - s.b[1]);
      return along <= tolModel;
    });
    if (drawnCenter) axisPos = R === profile.view.u.axis ? (drawnCenter.a[0] + drawnCenter.b[0]) / 2 : (drawnCenter.a[1] + drawnCenter.b[1]) / 2;
    halfChain = upperHalf(profile, R, axisPos, tolModel);
    if (halfChain.length < 3) {
      issues.push({ code: 'reference.drawing.view-ambiguous', severity: 'error', message: `the ${profile.view.name} view's silhouette does not cross its axis of revolution twice; it cannot be revolved.` });
      return noSnap;
    }
    for (const [r] of halfChain) {
      if (r <= tolModel) continue;
      if (!radial.some(l => Math.abs(l.measured - r) <= tolModel)) radial.push({ measured: r });
    }
    radial.sort((a, b) => b.measured - a.measured);
    const endCircles = endView ? [...endView.circles].sort((a, b) => b.r - a.r) : [];
    let diaIndex = 0;
    for (const l of radial) {
      diaIndex++;
      const name = radial.length === 1 ? 'diameter' : `dia${diaIndex}`;
      const byDim = diameterDims.find(d => d.axis !== axialAxis && Math.abs(d.measuredRadius - l.measured) <= tolModel * 2);
      const byCircle = endCircles.find(c => c.statedDiameter !== undefined && Math.abs(c.r - l.measured) <= tolModel * 2);
      const stated = byDim ? byDim.radius * 2 : byCircle?.statedDiameter;
      const measuredDia = round2(l.measured * 2);
      if (stated !== undefined) {
        const disagree = Math.abs(stated - l.measured * 2) > disagreementTol(stated);
        const src = byDim ? `dimension '${byDim.dim.text.text}' (${byDim.view} view)` : `callout '${byCircle!.callout!.text.text}' (${endView!.view.name} view)`;
        l.expr = params.declare(name, stated, `turned diameter — ${src}`);
        facts.push({
          id: (l.expr as { name: string }).name,
          statement: disagree
            ? `Diameter stated ${stated} mm by ${src}; the linework measures ${measuredDia} mm at the sheet scale. The stated value is used.`
            : `Diameter ${stated} mm stated by ${src}.`,
          kind: 'visible', source: 'dimension', region: textRegion(byDim ? byDim.dim : byCircle!.callout!), value: stated, confidence: 1,
          open: disagree,
          ...(disagree ? { disagreement: { stated, measured: measuredDia, unit: 'mm' as const } } : {}),
        });
      } else {
        l.expr = params.declare(name, measuredDia, `turned diameter — measured from linework at the sheet scale (no dimension)`);
        facts.push({
          id: (l.expr as { name: string }).name,
          statement: `Diameter ${measuredDia} mm measured from the ${profile.view.name} view linework; no dimension states it.`,
          kind: 'inferred', source: 'linework', value: measuredDia, confidence: toScale, open: true,
        });
      }
    }
    const mirrored = profile.outline.filter(p => {
      const [r, a] = R === profile.view.u.axis ? [p[0], p[1]] : [p[1], p[0]];
      const mr = 2 * axisPos - r;
      return profile.outline.some(q => {
        const [qr, qa] = R === profile.view.u.axis ? [q[0], q[1]] : [q[1], q[0]];
        return Math.abs(qr - mr) <= tolModel && Math.abs(qa - a) <= tolModel;
      });
    }).length;
    const symmetry = profile.outline.length ? round2(mirrored / profile.outline.length) : 0;
    facts.push({
      id: 'axis',
      statement: drawnCenter
        ? `Axis of revolution along ${axialAxis.toUpperCase()} on the drawn center line of the ${profile.view.name} view.`
        : `Axis of revolution along ${axialAxis.toUpperCase()} placed midway across the ${profile.view.name} view (symmetry of the turned silhouette; no center line drawn).`,
      kind: drawnCenter ? 'visible' : 'inferred', source: drawnCenter ? 'linework' : 'symmetry', value: axialAxis,
      // Share of silhouette vertices that have a mirror image across the axis.
      confidence: drawnCenter ? 1 : symmetry, open: !drawnCenter,
    });
  }

  // --- solve axis levels ------------------------------------------------------------------
  const extrudeAxisIsThinnest = (a: ModelAxis) => {
    if (kind !== 'extrude' || a !== normalAxis) return false;
    const ext = (x: ModelAxis) => { const l = axisLevels[x]; return l.levels.length ? l.levels[l.max].measured - l.levels[l.min].measured : Infinity; };
    // Plate-like: the extrusion is small next to both profile extents.
    return AXES.every(o => o === a || ext(a) <= 0.25 * ext(o));
  };
  const namer = (axis: ModelAxis, lo: number, hi: number): string => {
    const L = axisLevels[axis];
    const isMin = lo === L.min, isMax = hi === L.max;
    const loHole = L.levels[lo].hole, hiHole = L.levels[hi].hole;
    const A = axis.toUpperCase();
    if (kind === 'revolve' && axis === axialAxis) {
      if (isMin && isMax) return 'length';
      const sorted = L.levels.map((l, i) => [l.measured, i] as const).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      const rankHi = sorted.indexOf(hi);
      return sorted.indexOf(lo) === rankHi - 1 ? `step${rankHi}Length` : `shoulder${rankHi}Offset`;
    }
    if (isMin && isMax) return extrudeAxisIsThinnest(axis) ? 'thickness' : EXTENT_NAMES[axis];
    if (hiHole !== undefined && isMin) return `hole${hiHole + 1}${A}`;
    if (loHole !== undefined && isMax) return `hole${loHole + 1}${A}FromEnd`;
    if (loHole !== undefined && hiHole !== undefined) return `hole${loHole + 1}To${hiHole + 1}${A}`;
    const ext = L.levels[L.max].measured - L.levels[L.min].measured;
    const span = Math.abs(L.levels[hi].measured - L.levels[lo].measured);
    const role = span <= 0.25 * ext ? 'Thickness' : 'Offset';
    if (isMin) return `${SIDES[axis][0]}${role}`;
    if (isMax) return `${SIDES[axis][1]}${role}`;
    return `${axis}Step`;
  };

  for (const axis of AXES) {
    const L = axisLevels[axis];
    if (L.levels.length === 0) continue;
    // A turned part is sized by its diameters; only the axial levels are solved.
    if (kind === 'revolve' && axis !== axialAxis) continue;
    const root = L.min;
    L.levels[root].expr = num(0);
    const used = new Set<DimEdge>();
    const queue = [root];
    const assigned = () => L.levels.every(l => l.expr);
    for (let guard = 0; guard < L.levels.length * 4 + 8; guard++) {
      while (queue.length > 0) {
        const p = queue.shift()!;
        for (const e of edges[axis]) {
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
      if (assigned()) break;
      // Symmetry about the solved extent: mirror images and the centre.
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
      if (progressed) continue;
      // Otherwise measure the next level off the drawn linework.
      let pick = -1, from = -1, gap = Infinity;
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
      if (pick < 0) break;
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
    }
  }

  const levelExpr = (axis: ModelAxis, m: number): Expr => {
    const L = axisLevels[axis];
    const i = L.find(m);
    return i >= 0 && L.levels[i].expr ? L.levels[i].expr! : num(round2(L.snap(m)));
  };
  const extentOf = (axis: ModelAxis): number => {
    const L = axisLevels[axis];
    return L.levels.length ? L.levels[L.max].expr?.v ?? 0 : 0;
  };

  // --- profile loop -------------------------------------------------------------------------
  let loop: PartModel['loop'];
  let profileAxes: [ModelAxis, ModelAxis];
  let depth: Expr | undefined;
  let maxRadius: Expr | undefined;
  const extents: Record<ModelAxis, number> = { x: extentOf('x'), y: extentOf('y'), z: extentOf('z') };

  if (kind === 'extrude') {
    profileAxes = [profile.view.u.axis, profile.view.v.axis];
    loop = profile.elements.map(e => ({
      at: [levelExpr(profileAxes[0], e.a[0]), levelExpr(profileAxes[1], e.a[1])] as [Expr, Expr],
      bulge: e.bulge,
    }));
    const L = axisLevels[normalAxis];
    const drawnIn = geometry.filter(g => g !== profile && (g.view.u.axis === normalAxis || g.view.v.axis === normalAxis));
    if (L.levels.length >= 2 && drawnIn.length > 0) {
      depth = L.levels[L.max].expr!;
    } else {
      const thk = thicknessNote(sheet, mmPerUnit);
      if (thk) {
        depth = params.declare('thickness', thk.value, `extrusion depth — note '${thk.text}'`);
        facts.push({ id: 'thickness', statement: `Extrusion depth ${thk.value} mm stated by the note '${thk.text}'.`, kind: 'visible', source: 'dimension', value: thk.value, confidence: 1 });
      } else {
        const placeholder = round2(Math.max(1, 0.1 * Math.max(profile.extU, profile.extV)));
        depth = params.declare('thickness', placeholder, 'extrusion depth — NOT on the drawing; placeholder until resolved');
        issues.push({
          code: 'reference.drawing.depth-missing',
          severity: 'warn',
          message: `no view shows the part along ${normalAxis.toUpperCase()} and no thickness note was found; the extrusion depth is a ${placeholder} mm placeholder.`,
        });
        facts.push({
          id: 'thickness',
          statement: `Extrusion depth along ${normalAxis.toUpperCase()} is not given by any view or note; the script uses a ${placeholder} mm placeholder. Resolve it with the real value.`,
          kind: 'missing', confidence: 0, open: true,
        });
      }
      extents[normalAxis] = depth.v;
    }
  } else {
    profileAxes = [R!, axialAxis]; // path x = radial, y = axial (revolve about path y)
    const radialExpr = (r: number): Expr => {
      if (r <= tolModel) return num(0);
      const l = radial.reduce((b, x) => (Math.abs(x.measured - r) < Math.abs(b.measured - r) ? x : b), radial[0]);
      return half(l.expr!);
    };
    const pts = halfChain.map(([r, a]) => ({ at: [radialExpr(r), levelExpr(axialAxis, a)] as [Expr, Expr], bulge: 0 }));
    loop = dedupeLoop(pts);
    maxRadius = half(radial[0].expr!);
    extents[R!] = maxRadius.v * 2;
    const other = AXES.find(a => a !== R && a !== axialAxis)!;
    extents[other] = maxRadius.v * 2;
  }

  // --- holes --------------------------------------------------------------------------------------
  const holes: HoleModel[] = [];
  const diaGroups: Array<{ key: string; expr: Expr }> = [];
  const holeCandidates = [...holeCircles];
  if (kind === 'revolve' && endView) {
    for (const c of endView.circles) {
      if (!radial.some(l => Math.abs(l.measured - c.r) <= tolModel * 2)) holeCandidates.push(c);
    }
  }
  holeCandidates.forEach((c, k) => {
    const g = geometry.find(x => x.view === c.view)!;
    const axis = g.normal;
    const name = `hole${k + 1}`;
    const stated = c.statedDiameter;
    const diaValue = stated ?? round2(c.r * 2);
    const groupKey = `${axis}:${diaValue}:${stated !== undefined}`;
    let group = diaGroups.find(d => d.key === groupKey);
    if (!group) {
      const base = holeCandidates.length === 1 || new Set(holeCandidates.map(h => (h.statedDiameter ?? round2(h.r * 2)))).size === 1 ? 'holeDia' : `holeDia${diaGroups.length + 1}`;
      const expr = params.declare(base, diaValue, stated !== undefined ? `hole diameter — callout '${c.callout!.text.text}'` : 'hole diameter — measured from the drawn circle (no callout)');
      facts.push(stated !== undefined
        ? { id: (expr as { name: string }).name, statement: `Hole diameter ${stated} mm stated by callout '${c.callout!.text.text}' (${g.view.name} view).`, kind: 'visible', source: 'dimension', region: textRegion(c.callout!), value: stated, confidence: 1 }
        : { id: (expr as { name: string }).name, statement: `Hole diameter ${diaValue} mm measured from the circle drawn in the ${g.view.name} view; no callout states it.`, kind: 'inferred', source: 'linework', value: diaValue, confidence: toScale, open: true });
      group = { key: groupKey, expr };
      diaGroups.push(group);
    }

    const center: Partial<Record<ModelAxis, Expr>> = {};
    if (kind === 'revolve' && g === endView) {
      for (const a of AXES) if (a !== axis) center[a] = maxRadius!;
    } else {
      center[g.view.u.axis] = levelExpr(g.view.u.axis, c.u);
      center[g.view.v.axis] = levelExpr(g.view.v.axis, c.v);
    }

    // Depth: hidden walls at centre ± r in a view that shows the hole axis.
    const span = hiddenSpan(geometry, g, c, axis, tolModel);
    const L = axisLevels[axis];
    const lo = L.levels.length ? L.levels[L.min].expr! : num(0);
    const hi = L.levels.length ? L.levels[L.max].expr! : depth ?? num(0);
    const spanLo = span ? levelExpr(axis, span[0]) : lo;
    const spanHi = span ? levelExpr(axis, span[1]) : hi;
    const viewer = (c.hidden ? -1 : 1) * VIEWER_SIDE[g.view.name];
    const through = c.callout?.parsed.through ?? false;
    const statedDepth = c.callout?.parsed.depth !== undefined ? c.callout.parsed.depth * mmPerUnit : undefined;
    let from: Expr, length: Expr, isThrough = false;
    if (statedDepth !== undefined) {
      const dp = params.declare(`${name}Depth`, statedDepth, `blind hole depth — callout '${c.callout!.text.text}'`);
      facts.push({ id: (dp as { name: string }).name, statement: `Blind depth ${statedDepth} mm stated by callout '${c.callout!.text.text}'.`, kind: 'visible', source: 'dimension', region: textRegion(c.callout!), value: statedDepth, confidence: 1 });
      const entry = viewer > 0 ? spanHi : spanLo;
      from = viewer > 0 ? sub(entry, dp) : sub(entry, num(1));
      length = add(dp, num(1));
    } else if (through || span || kind === 'revolve') {
      isThrough = through || !span;
      from = sub(spanLo, num(1));
      length = add(sub(spanHi, spanLo), num(2));
      if (!through) {
        facts.push(span
          ? { id: `holeDepth:${name}`, statement: `Hole ${name} runs ${round2(spanHi.v - spanLo.v)} mm along ${axis.toUpperCase()}, from its hidden lines; no depth is lettered.`, kind: 'inferred', source: 'linework', value: round2(spanHi.v - spanLo.v), confidence: toScale, open: true }
          : { id: `holeDepth:${name}`, statement: `Hole ${name} has no depth callout and no hidden lines; treated as through.`, kind: 'assumed', source: 'default', value: 'THRU', confidence: 0, open: true });
      }
    } else {
      isThrough = true;
      from = sub(lo, num(1));
      length = add(sub(hi, lo), num(2));
      facts.push({ id: `holeDepth:${name}`, statement: `Hole ${name} has no depth callout and no hidden lines in any view; treated as through the whole part.`, kind: 'assumed', source: 'default', value: 'THRU', confidence: 0, open: true });
    }
    holes.push({ name, axis, center, diameter: group.expr, from, length, through: isThrough || through });
  });

  // --- sheet-level facts ---------------------------------------------------------------------------
  if (toScale > 0 && toScale < 1) {
    facts.push({
      id: 'to-scale',
      statement: `${agreeing} of ${allEdges.length} linear dimensions agree with their drawn length at the sheet scale; measured (undimensioned) values carry that fraction as confidence.`,
      kind: 'inferred', source: 'linework', value: toScale, confidence: toScale, open: false,
    });
  }

  const model: PartModel = {
    kind,
    profileView: profile.view.name,
    profileAxes,
    loop,
    ...(kind === 'extrude' ? { extrudeAxis: normalAxis, depth } : { revolveAxis: axialAxis, maxRadius }),
    holes,
    params: params.params,
    extents,
  };
  const snap = (axis: ModelAxis, m: number) => axisLevels[axis].snap(m);
  return { model, facts: facts.facts, issues, geometry, snap };
}

function boxDistance(b: { x0: number; y0: number; x1: number; y1: number }, p: P2): number {
  const dx = Math.max(b.x0 - p[0], 0, p[0] - b.x1);
  const dy = Math.max(b.y0 - p[1], 0, p[1] - b.y1);
  return Math.hypot(dx, dy);
}

/** `THK 5`, `5 THK`, `THICKNESS 5`, `5 mm THK` → the stated extrusion depth. */
function thicknessNote(sheet: SheetAnalysis, mmPerUnit: number): { value: number; text: string } | null {
  for (const t of sheet.notes) {
    const m = /^(?:(?:THK|THICKNESS)\.?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?|(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?(?:THK|THICK)\.?)$/i.exec(t.text.trim());
    if (m) return { value: Number((m[1] ?? m[2]).replace(',', '.')) * mmPerUnit, text: t.text };
  }
  return null;
}

/** Axial extent [lo, hi] of the hidden walls of `c` in another view along `axis`. */
function hiddenSpan(geometry: readonly ViewGeometry[], host: ViewGeometry, c: ViewCircle, axis: ModelAxis, tol: number): [number, number] | null {
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
function upperHalf(g: ViewGeometry, radialAxis: ModelAxis, axisPos: number, tol: number): Array<[number, number]> {
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

function dedupeLoop(pts: Array<{ at: [Expr, Expr]; bulge: number }>): Array<{ at: [Expr, Expr]; bulge: number }> {
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
