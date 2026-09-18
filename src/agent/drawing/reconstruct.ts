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
import type { AssumptionFact } from '../vision/ledger';
import { type LoopElement, type P2, type Seg2 } from './geometry2d';
import { num, type Expr } from './expr';
import type { RadialCallout, SheetAnalysis } from './sheet';
import { type DrawingView, type ModelAxis, type OrthoViewName, type ViewSet } from './views';
import {
  AXES,
  FactBook,
  ParamRegistry,
  buildViewGeometry,
  round2,
  solveAxisLevels,
  upperHalf,
} from './reconstructSolver';
import {
  applyRadialCallouts,
  buildAxisLevels,
  buildHoles,
  buildProfileLoop,
  chooseReconstruction,
  collectDimensionEdges,
  collectHoleCircles,
  countMirrored,
  findEndView,
  recordRevolveAxis,
  solveRadialDiameters,
} from './reconstructPhases';

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
  applyRadialCallouts(sheet.radialCallouts, geometry, mmPerUnit, tolModel, facts, issues);

  // --- part kind -----------------------------------------------------------------
  const endView = findEndView(geometry, tolModel);

  // --- holes (numbering first: levels are named after them) -----------------------
  const holeCircles = collectHoleCircles(geometry, endView, tolModel);
  // Deterministic numbering: by view, callout-stated first (so a pattern's
  // names come from a stated member), then row-major from the view origin.
  const viewRank = (c: ViewCircle) => geometry.findIndex(g => g.view === c.view);
  holeCircles.sort((a, b) =>
    viewRank(a) - viewRank(b) ||
    Number(b.statedDiameter !== undefined) - Number(a.statedDiameter !== undefined) ||
    Math.round((a.v - b.v) / tolModel) ||
    a.u - b.u);

  // --- levels ----------------------------------------------------------------------
  const axisLevels = buildAxisLevels(geometry, endView, holeCircles, tolModel);

  // --- dimension edges ---------------------------------------------------------------
  const disagreementTol = (v: number) => Math.max(0.1, 0.005 * v);
  const { edges, diameterDims } = collectDimensionEdges(sheet.linearDims, geometry, axisLevels, sheetPerModel, mmPerUnit, facts, issues);

  // Linework-to-dimension agreement: the confidence behind every measured value.
  const allEdges = AXES.flatMap(a => edges[a]);
  const agreeing = allEdges.filter(e => Math.abs(e.value - e.measured) <= disagreementTol(e.value)).length;
  const toScale = allEdges.length === 0 ? 0 : round2(agreeing / allEdges.length);

  // --- choose reconstruction ------------------------------------------------------------
  const choice = chooseReconstruction(geometry, endView, tolModel, facts, issues);
  if (!choice) return noSnap;
  const { kind, profile, normalAxis } = choice;

  // --- radial levels (revolve) ---------------------------------------------------------
  const R = kind === 'revolve' ? (profile.view.u.axis === normalAxis ? profile.view.v.axis : profile.view.u.axis) : null;
  const axialAxis = normalAxis;
  const radial: Array<{ measured: number; expr?: Expr }> = [];
  let halfChain: Array<[number, number]> = []; // (radial, axial)
  let axisPos = 0;
  let drawnCenter: Seg2 | undefined;
  if (kind === 'revolve' && R) {
    const ext = R === profile.view.u.axis ? profile.extU : profile.extV;
    axisPos = ext / 2;
    drawnCenter = profile.centerSegs.find(s => {
      const along = R === profile.view.u.axis ? Math.abs(s.a[0] - s.b[0]) : Math.abs(s.a[1] - s.b[1]);
      return along <= tolModel;
    });
    if (drawnCenter) axisPos = R === profile.view.u.axis ? (drawnCenter.a[0] + drawnCenter.b[0]) / 2 : (drawnCenter.a[1] + drawnCenter.b[1]) / 2;
    halfChain = upperHalf(profile, R, axisPos, tolModel);
    if (halfChain.length < 3) {
      issues.push({ code: 'reference.drawing.view-ambiguous', severity: 'error', message: `the ${profile.view.name} view's silhouette does not cross its axis of revolution twice; it cannot be revolved.` });
      return noSnap;
    }
    solveRadialDiameters({ radial, halfChain, profile, R, axialAxis, endView, diameterDims, tolModel, toScale, disagreementTol, params, facts });
    recordRevolveAxis({ profile, outlineMirrored: countMirrored(profile, R, axisPos, tolModel), axialAxis, drawnCenter, facts });
  }

  // --- solve axis levels ------------------------------------------------------------------
  solveAxisLevels({
    axisLevels, edges, kind, normalAxis, axialAxis, toScale, disagreementTol, params, facts,
  });

  const levelExpr = (axis: ModelAxis, m: number): Expr => {
    const L = axisLevels[axis];
    const i = L.find(m);
    return i >= 0 && L.levels[i].expr ? L.levels[i].expr! : num(round2(L.snap(m)));
  };
  // --- profile loop -------------------------------------------------------------------------
  const profileBuild = buildProfileLoop({
    kind, profile, normalAxis, axialAxis, R, radial, halfChain, axisLevels, levelExpr,
    geometry, tolModel, sheet, mmPerUnit, params, facts, issues,
  });
  const { loop, profileAxes, depth, maxRadius, extents } = profileBuild;

  // --- holes --------------------------------------------------------------------------------------
  const holes = buildHoles({
    holeCircles, geometry, endView, kind, R, radial, axisLevels, levelExpr, maxRadius, depth,
    tolModel, mmPerUnit, toScale, params, facts,
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
