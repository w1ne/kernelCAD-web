// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/renderContext.ts

import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { DrawingDeclarations, DrawingToleranceDecl } from '../../../../shared/intent/drawingGdtRecord';
import { modelToSheet } from '../drawingAnnotations';
import { formatDimValue } from '../drawingLayout';
import type { DrawingViewName, ProjectionAngle, Pt2, SheetSpec } from '../drawingLayout';
import { canonicalAxis } from '../drawingFeatures';
import type { DrawingFeatureModel, HoleComposite, PlanarFaceInfo, V3 } from '../drawingFeatures';
import type { Box, Obstacles, Seg } from '../drawingObstacles';
import type { WorldFramePart } from '../sceneToWorldFrame';
import type { AutoDrawingInput, DrawingReportAnnotation } from './contracts';
import type { Datum } from './datums';
import type { AutoAnnotateKind, NormalisedOptions } from './options';
import type { Rendered } from './placement';
import { STANDARD_VIEWS } from './views';
import type { EdgeLine } from './views';

export interface LinearItem {
  kind: 'hole-position' | 'overall';
  view: DrawingViewName;
  side: 'top' | 'bottom' | 'left' | 'right';
  from: Pt2;
  to: Pt2;
  label: string;
  order: number;
}

export interface PlacedItem {
  kind: string;
  view: DrawingViewName;
  text: string;
  svg: string;
  boxes: Box[];
  owner: number;
}

type DimSides = Record<DrawingViewName, { horizontal: 'top' | 'bottom'; vertical: 'left' | 'right' }>;

/** Free side of each view that linear dimensions stack on (third angle). */
export const HOLE_SIDES: DimSides = {
  top: { horizontal: 'top', vertical: 'left' },
  front: { horizontal: 'bottom', vertical: 'right' },
  left: { horizontal: 'bottom', vertical: 'left' },
  iso: { horizontal: 'bottom', vertical: 'right' },
};

/** The same, for the first-angle grid (see `computeSheetLayout`): the front
 *  view's free sides are above and left, the top view's below and right,
 *  the left view's above and right. */
export const HOLE_SIDES_FIRST_ANGLE: DimSides = {
  top: { horizontal: 'bottom', vertical: 'right' },
  front: { horizontal: 'top', vertical: 'left' },
  left: { horizontal: 'top', vertical: 'right' },
  iso: { horizontal: 'bottom', vertical: 'right' },
};

export function dimensionSides(projection: ProjectionAngle | undefined): DimSides {
  return projection === 'first' ? HOLE_SIDES_FIRST_ANGLE : HOLE_SIDES;
}

export function holeLabel(h: HoleComposite, count: number): string {
  let s = `⌀${formatDimValue(h.diameter)}`;
  s += h.through ? ' THRU' : ` ▾ ${formatDimValue(h.depth ?? 0)}`;
  if (h.counterbore) s += ` ⌴⌀${formatDimValue(h.counterbore.diameter)} ▾ ${formatDimValue(h.counterbore.depth)}`;
  if (h.countersink) s += ` ⌵⌀${formatDimValue(h.countersink.diameter)} × ${formatDimValue(h.countersink.angleDeg)}°`;
  return count > 1 ? `${count}× ${s}` : s;
}

export function holeKey(h: HoleComposite): string {
  const f = (n: number | undefined) => (n === undefined ? '-' : formatDimValue(n));
  const a = canonicalAxis(h.axis).map(v => Math.round(v * 1000)).join(',');
  return [
    a, f(h.diameter), h.through ? 'T' : f(h.depth),
    f(h.counterbore?.diameter), f(h.counterbore?.depth),
    f(h.countersink?.diameter), f(h.countersink?.angleDeg),
  ].join('|');
}

export interface ResolvedTolerance {
  decl: DrawingToleranceDecl;
  index: number;
  /** Axis-type features (circular edge, cylindrical face). */
  axis?: { point: V3; dir: V3 };
  plane?: PlanarFaceInfo | null;
  target: V3;
  view: DrawingViewName;
  edgeLine?: EdgeLine | null;
}

export interface HoleGroup {
  key: string;
  holes: HoleComposite[];
  view: DrawingViewName;
  rows: string[][];
  label: string;
}

/** Shared mutable state and closures threaded through the auto-drawing phases.
 *  Field-by-field this is exactly the local state `renderAutoDrawing` used to
 *  hold inline; phases take the context instead of closing over it. */
export interface RenderCtx {
  input: AutoDrawingInput;
  opts: NormalisedOptions;
  parts: readonly WorldFramePart[];
  declarations: DrawingDeclarations;
  views: AutoDrawingInput['views'];
  scale: number;
  sheet: SheetSpec;
  include: Set<AutoAnnotateKind>;
  model: DrawingFeatureModel;
  diagnostics: CompilerDiagnostic[];
  svg: string[];
  bottomReserve: Record<DrawingViewName, number>;
  byKind: Record<string, number>;
  annotations: DrawingReportAnnotation[];
  fixed: Map<string, Datum>;
  datums: Map<string, Datum>;
  frameDatums: string[];
  resolvedTols: ResolvedTolerance[];
  consumedTols: Set<number>;
  obstacles: Obstacles;
  placed: PlacedItem[];
  ownerSeq: number;
  datumLines: Map<string, EdgeLine>;
  holeGroups: HoleGroup[];
  linear: LinearItem[];
}

export function toSheet(ctx: RenderCtx, p: V3, view: DrawingViewName): Pt2 {
  return modelToSheet(p, view, ctx.views[view].placement, ctx.scale);
}

export function commit(ctx: RenderCtx, kind: string, view: DrawingViewName, text: string, r: Rendered): void {
  const owner = ctx.ownerSeq++;
  for (const s of r.segments) ctx.obstacles.addSegment(s, owner);
  for (const b of r.boxes) ctx.obstacles.addBox(b, owner);
  ctx.placed.push({ kind, view, text, svg: r.svg, boxes: r.boxes, owner });
  ctx.byKind[kind] = (ctx.byKind[kind] ?? 0) + 1;
}

// A label enclosed by a view's outline (geometry on all four sides) reads
// as part of the part; prefer the free sheet around the views.
function isEnclosed(ctx: RenderCtx, b: Box): boolean {
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  for (const name of [...STANDARD_VIEWS, 'iso'] as DrawingViewName[]) {
    const vb = ctx.views[name].placement.box;
    if (cx < vb.x || cx > vb.x + vb.w || cy < vb.y || cy > vb.y + vb.h) continue;
    const rays: Seg[] = [
      [cx, cy, vb.x - 1, cy], [cx, cy, vb.x + vb.w + 1, cy],
      [cx, cy, cx, vb.y - 1], [cx, cy, cx, vb.y + vb.h + 1],
    ];
    return rays.every(ray => ctx.obstacles.crossings(ray) > 0);
  }
  return false;
}

export interface Candidate {
  render: () => Rendered;
  penalty: number;
}

interface Scored<C extends Candidate> {
  r: Rendered;
  cost: number;
  score: number;
  candidate: C;
}

function pick<C extends Candidate>(ctx: RenderCtx, owner: number, candidates: readonly C[]): Scored<C> | null {
  let best: Scored<C> | null = null;
  for (const c of candidates) {
    const r = c.render();
    const cost = ctx.obstacles.cost(r.boxes, owner) +
      r.segments.reduce((n, seg) => n + ctx.obstacles.labelHits(seg, owner) * 5, 0);
    const crossings = r.segments.reduce((n, seg) => n + ctx.obstacles.crossings(seg), 0);
    const inside = r.boxes.length > 0 && isEnclosed(ctx, r.boxes[0]) ? 25 : 0;
    const score = cost * 1000 + c.penalty + crossings * 6 + inside;
    if (best === null || score < best.score) best = { r, cost, score, candidate: c };
    if (cost === 0 && c.penalty === 0 && crossings === 0 && inside === 0) break;
  }
  return best;
}

/** The best-scoring candidate. When none of `candidates` is clear of
 *  geometry, labels and the frame, the wider `fallback` set (more angles,
 *  longer leaders onto the free sheet around the view) is tried as well and
 *  the lower score wins. A clear first-tier slot never looks at the
 *  fallback, so sheets that were already clear keep their placement. */
export function choose<C extends Candidate>(
  ctx: RenderCtx,
  owner: number,
  candidates: readonly C[],
  fallback?: () => readonly C[],
): { r: Rendered; cost: number; candidate: C } | null {
  const best = pick(ctx, owner, candidates);
  if (best === null || best.cost === 0 || fallback === undefined) return best;
  const wide = pick(ctx, owner, fallback());
  return wide !== null && wide.score < best.score ? wide : best;
}

export function outwardAngle(ctx: RenderCtx, p: Pt2, view: DrawingViewName): number {
  const box = ctx.views[view].placement.box;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  return Math.hypot(dx, dy) < 1e-6 ? -Math.PI / 4 : Math.atan2(dy, dx);
}
