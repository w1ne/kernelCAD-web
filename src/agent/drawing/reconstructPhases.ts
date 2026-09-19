// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/reconstructPhases.ts
//
// Natural phases of `reconstructPart`: associate callouts, find the end view,
// collect hole circles and axis levels, sort dimensions onto axes, choose the
// profile, solve radial diameters, and build the profile loop and holes.

import { pointLine, type Seg2 } from './geometry2d';
import { add, half, num, sub, type Expr } from './expr';
import type { LinearDimension, SheetAnalysis } from './sheet';
import { sheetToModel, type ModelAxis, type OrthoViewName } from './views';
import type { DrawingIssue, HoleModel, PartModel, ViewCircle, ViewGeometry } from './reconstruct';
import {
  AXES,
  AxisLevels,
  VIEWER_SIDE,
  boxDistance,
  coordOn,
  dedupeLoop,
  hiddenSpan,
  isRectangle,
  levelExtent,
  round2,
  textRegion,
  thicknessNote,
  type DimEdge,
  type FactBook,
  type ParamRegistry,
} from './reconstructSolver';

/** Tie radial/⌀ callouts to the circles they dimension; mark the group they state. */
export function applyRadialCallouts(
  callouts: SheetAnalysis['radialCallouts'],
  geometry: readonly ViewGeometry[],
  mmPerUnit: number,
  tolModel: number,
  facts: FactBook,
  issues: DrawingIssue[],
): void {
  for (const callout of callouts) {
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
}

/** A view showing only concentric circles (a turned part's end view), if any. */
export function findEndView(geometry: readonly ViewGeometry[], tolModel: number): ViewGeometry | undefined {
  return geometry.find(g =>
    g.circles.length > 0 &&
    g.visibleSegs.length === 0 &&
    g.circles.every(c => Math.hypot(c.u - g.circles[0].u, c.v - g.circles[0].v) <= tolModel * 3) &&
    geometry.some(o => o !== g && (o.view.u.axis === g.normal || o.view.v.axis === g.normal)),
  );
}

/** Circles that are holes (every circle not in the end view), deduplicated across views. */
export function collectHoleCircles(geometry: readonly ViewGeometry[], endView: ViewGeometry | undefined, tolModel: number): ViewCircle[] {
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
  return holeCircles;
}

/** Distinct coordinates along each axis, seeded from silhouettes, the end view and holes. */
export function buildAxisLevels(
  geometry: readonly ViewGeometry[],
  endView: ViewGeometry | undefined,
  holeCircles: readonly ViewCircle[],
  tolModel: number,
): Record<ModelAxis, AxisLevels> {
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
  return axisLevels;
}

export interface DiameterDim {
  dim: LinearDimension;
  axis: ModelAxis;
  center: number;
  radius: number;
  measuredRadius: number;
  view: OrthoViewName;
}

/** Sort each lettered linear dimension onto the axis it constrains (or call it out). */
export function collectDimensionEdges(
  linearDims: readonly LinearDimension[],
  geometry: readonly ViewGeometry[],
  axisLevels: Record<ModelAxis, AxisLevels>,
  sheetPerModel: number,
  mmPerUnit: number,
  facts: FactBook,
  issues: DrawingIssue[],
): { edges: Record<ModelAxis, DimEdge[]>; diameterDims: DiameterDim[] } {
  const edges: Record<ModelAxis, DimEdge[]> = { x: [], y: [], z: [] };
  const diameterDims: DiameterDim[] = [];
  for (const dim of linearDims) {
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
  return { edges, diameterDims };
}

export interface ReconstructionChoice {
  kind: PartModel['kind'];
  profile: ViewGeometry;
  normalAxis: ModelAxis;
}

/** Pick the profile view and part kind, or record why no reconstruction is possible. */
export function chooseReconstruction(
  geometry: readonly ViewGeometry[],
  endView: ViewGeometry | undefined,
  tolModel: number,
  facts: FactBook,
  issues: DrawingIssue[],
): ReconstructionChoice | null {
  let kind: PartModel['kind'];
  let profile: ViewGeometry | undefined;
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
      return null;
    }
  } else {
    kind = 'extrude';
    const order: OrthoViewName[] = ['top', 'front', 'left', 'right', 'bottom'];
    const candidates = geometry.filter(g => g.outline.length >= 3);
    if (candidates.length === 0) {
      issues.push({ code: 'reference.drawing.view-ambiguous', severity: 'error', message: 'no view has a closed silhouette to use as a profile.' });
      return null;
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
  return { kind, profile, normalAxis };
}

export interface RadialLevel { measured: number; expr?: Expr }

/** Name and size each turned diameter, from a ⌀ dimension or a callout when stated. */
export function solveRadialDiameters(args: {
  radial: RadialLevel[];
  halfChain: Array<[number, number]>;
  profile: ViewGeometry;
  R: ModelAxis;
  axialAxis: ModelAxis;
  endView: ViewGeometry | undefined;
  diameterDims: readonly DiameterDim[];
  tolModel: number;
  toScale: number;
  disagreementTol: (v: number) => number;
  params: ParamRegistry;
  facts: FactBook;
}): void {
  const { radial, halfChain, profile, axialAxis, endView, diameterDims, tolModel, toScale, disagreementTol, params, facts } = args;
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
}

/** Share of silhouette vertices that have a mirror image across the axis. */
export function countMirrored(profile: ViewGeometry, R: ModelAxis, axisPos: number, tolModel: number): number {
  const mirrored = profile.outline.filter(p => {
    const [r, a] = R === profile.view.u.axis ? [p[0], p[1]] : [p[1], p[0]];
    const mr = 2 * axisPos - r;
    return profile.outline.some(q => {
      const [qr, qa] = R === profile.view.u.axis ? [q[0], q[1]] : [q[1], q[0]];
      return Math.abs(qr - mr) <= tolModel && Math.abs(qa - a) <= tolModel;
    });
  }).length;
  return profile.outline.length ? round2(mirrored / profile.outline.length) : 0;
}

/** Record the revolution axis, and whether it came off the drawn centre line. */
export function recordRevolveAxis(args: {
  profile: ViewGeometry;
  outlineMirrored: number;
  axialAxis: ModelAxis;
  drawnCenter: Seg2 | undefined;
  facts: FactBook;
}): void {
  const { profile, outlineMirrored, axialAxis, drawnCenter, facts } = args;
  const symmetry = outlineMirrored;
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


export interface ProfileBuild {
  loop: PartModel['loop'];
  profileAxes: [ModelAxis, ModelAxis];
  depth: Expr | undefined;
  maxRadius: Expr | undefined;
  extents: Record<ModelAxis, number>;
}

/** Turn the chosen profile into a path loop and solve the extrusion/revolve extents. */
export function buildProfileLoop(args: {
  kind: PartModel['kind'];
  profile: ViewGeometry;
  normalAxis: ModelAxis;
  axialAxis: ModelAxis;
  R: ModelAxis | null;
  radial: readonly RadialLevel[];
  halfChain: ReadonlyArray<[number, number]>;
  axisLevels: Record<ModelAxis, AxisLevels>;
  levelExpr: (axis: ModelAxis, m: number) => Expr;
  geometry: readonly ViewGeometry[];
  tolModel: number;
  sheet: SheetAnalysis;
  mmPerUnit: number;
  params: ParamRegistry;
  facts: FactBook;
  issues: DrawingIssue[];
}): ProfileBuild {
  const { kind, profile, normalAxis, axialAxis, R, radial, halfChain, axisLevels, levelExpr, geometry, tolModel, sheet, mmPerUnit, params, facts, issues } = args;
  let loop: PartModel['loop'];
  let profileAxes: [ModelAxis, ModelAxis];
  let depth: Expr | undefined;
  let maxRadius: Expr | undefined;
  const extents: Record<ModelAxis, number> = { x: levelExtent(axisLevels.x), y: levelExtent(axisLevels.y), z: levelExtent(axisLevels.z) };

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
  return { loop, profileAxes, depth, maxRadius, extents };
}

export function buildHoles(args: {
  holeCircles: readonly ViewCircle[];
  geometry: readonly ViewGeometry[];
  endView: ViewGeometry | undefined;
  kind: PartModel['kind'];
  R: ModelAxis | null;
  radial: readonly RadialLevel[];
  axisLevels: Record<ModelAxis, AxisLevels>;
  levelExpr: (axis: ModelAxis, m: number) => Expr;
  maxRadius: Expr | undefined;
  depth: Expr | undefined;
  tolModel: number;
  mmPerUnit: number;
  toScale: number;
  params: ParamRegistry;
  facts: FactBook;
}): HoleModel[] {
  const { holeCircles, geometry, endView, kind, radial, axisLevels, levelExpr, maxRadius, depth, tolModel, mmPerUnit, toScale, params, facts } = args;
  const holes: HoleModel[] = [];
  const diaGroups: Array<{ key: string; expr: Expr }> = [];
  const holeCandidates = [...holeCircles];
  if (kind === 'revolve' && endView) {
    for (const c of endView.circles) {
      if (!radial.some(l => Math.abs(l.measured - c.r) <= tolModel * 2)) holeCandidates.push(c);
    }
  }
  function resolveDiameterGroup(c: ViewCircle, g: ViewGeometry): Expr {
    const stated = c.statedDiameter;
    const diaValue = stated ?? round2(c.r * 2);
    const groupKey = `${g.normal}:${diaValue}:${stated !== undefined}`;
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
    return group.expr;
  }

  function resolveHoleExtent(c: ViewCircle, g: ViewGeometry, axis: ModelAxis, name: string): { from: Expr; length: Expr; isThrough: boolean } {
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
    return { from, length, isThrough };
  }

  holeCandidates.forEach((c, k) => {
    const g = geometry.find(x => x.view === c.view)!;
    const axis = g.normal;
    const name = `hole${k + 1}`;
    const diameter = resolveDiameterGroup(c, g);

    const center: Partial<Record<ModelAxis, Expr>> = {};
    if (kind === 'revolve' && g === endView) {
      for (const a of AXES) if (a !== axis) center[a] = maxRadius!;
    } else {
      center[g.view.u.axis] = levelExpr(g.view.u.axis, c.u);
      center[g.view.v.axis] = levelExpr(g.view.v.axis, c.v);
    }

    const { from, length, isThrough } = resolveHoleExtent(c, g, axis, name);
    const through = c.callout?.parsed.through ?? false;
    holes.push({ name, axis, center, diameter, from, length, through: isThrough || through });
  });
  return holes;
}
