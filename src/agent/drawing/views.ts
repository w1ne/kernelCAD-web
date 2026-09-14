// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/views.ts
//
// Stage 3: cluster geometry linework into views and name them.
//
// A view is a connected island of visible / thin / hidden linework. Islands
// dominated by slanted straight lines are pictorials (isometric) and take no
// part in reconstruction. The orthographic views are identified by
// PROJECTION ALIGNMENT, the rule every multiview sheet obeys regardless of
// convention: the front view shares its horizontal extent with the plan view
// and its vertical extent with the side view. The view aligned both ways is
// the front.
//
// Which physical side the neighbours show depends on the projection angle:
//   third-angle — plan ABOVE front is the top view; side view LEFT of front is
//                 the left view.
//   first-angle — plan BELOW front is the top view; side view RIGHT of front is
//                 the left view.
// Coordinates do not depend on it: in either convention the edge of a
// neighbouring view that faces the front view is the part's front (-Y) face,
// so model Y always increases away from the front view. Model X runs with the
// front view's horizontal, model Z with its vertical.

import { bboxGap, dist, unionBBox, type BBox2 } from './geometry2d';
import type { ClassifiedPath } from './sheet';
import type { PositionedText } from './pdfVectors';

export type ModelAxis = 'x' | 'y' | 'z';
export type OrthoViewName = 'front' | 'top' | 'bottom' | 'left' | 'right';

/** Maps one sheet direction of a view onto a model axis. */
export interface AxisMap {
  axis: ModelAxis;
  /** Sheet coordinate that carries it: 0 = sheet x, 1 = sheet y. */
  sheetIndex: 0 | 1;
  /** +1 when the model axis grows with the sheet coordinate, −1 when against it. */
  sign: 1 | -1;
}

export interface DrawingView {
  name: OrthoViewName;
  /** Sheet bbox of the view's visible + hidden linework. */
  bbox: BBox2;
  paths: ClassifiedPath[];
  /** Horizontal then vertical sheet direction mapped to model axes. */
  u: AxisMap;
  v: AxisMap;
  /** How the name was established. */
  identifiedBy: 'alignment' | 'label' | 'single-view';
  label?: string;
}

export interface ViewSet {
  views: DrawingView[];
  pictorials: BBox2[];
  /** Islands that aligned with nothing and were not pictorial. */
  unplaced: BBox2[];
  projection: 'third' | 'first';
  ambiguities: string[];
}

const GEOMETRY_CLASSES = new Set(['visible', 'thin', 'hidden']);

export interface Island {
  bbox: BBox2;
  paths: ClassifiedPath[];
}

/** Union-find clustering of geometry paths whose boxes touch or nearly touch. */
export function clusterIslands(paths: readonly ClassifiedPath[], gap = 1.5): Island[] {
  const geo = paths.filter(p => GEOMETRY_CLASSES.has(p.cls));
  const parent = geo.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < geo.length; i++) {
    for (let j = i + 1; j < geo.length; j++) {
      if (bboxGap(geo[i].bbox, geo[j].bbox) <= gap) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, ClassifiedPath[]>();
  geo.forEach((p, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(p);
    else groups.set(r, [p]);
  });
  const islands: Island[] = [];
  for (const g of groups.values()) {
    let box = g[0].bbox;
    for (const p of g) box = unionBBox(box, p.bbox);
    if (Math.max(box.x1 - box.x0, box.y1 - box.y0) < 1) continue;
    islands.push({ bbox: box, paths: g });
  }
  // Center lines belong to whichever island they cross.
  for (const p of paths) {
    if (p.cls !== 'center') continue;
    const host = islands.find(is => bboxGap(is.bbox, p.bbox) === 0);
    if (host) host.paths.push(p);
  }
  return islands;
}

/** Fraction of straight-line length that is neither horizontal nor vertical. */
export function slantedFraction(island: Island): number {
  let slanted = 0, total = 0;
  for (const p of island.paths) {
    if (p.cls === 'center') continue;
    for (let i = 0; i + 1 < p.points.length; i++) {
      const a = p.points[i], b = p.points[i + 1];
      const len = dist(a, b);
      if (len < 1) continue; // chords of curves are short; only real straight edges vote
      total += len;
      const ang = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0])) % (Math.PI / 2);
      if (ang > (4 * Math.PI) / 180 && ang < (86 * Math.PI) / 180) slanted += len;
    }
  }
  return total === 0 ? 0 : slanted / total;
}

const LABELS: Record<string, OrthoViewName | 'pictorial'> = {
  FRONT: 'front', TOP: 'top', PLAN: 'top', BOTTOM: 'bottom', LEFT: 'left', RIGHT: 'right',
  ISOMETRIC: 'pictorial', ISO: 'pictorial', PICTORIAL: 'pictorial',
};

type ViewLabel = { name: OrthoViewName | 'pictorial'; text: string };

/**
 * Assign each view-name caption (FRONT, TOP, ISOMETRIC…) to the one island it
 * captions: the nearest island it sits just below (or just above), measured
 * from the island's edge. Nearest wins, so a caption pushed down between two
 * stacked views by a dimension band still labels the view it belongs to.
 */
function assignLabels(islands: readonly Island[], notes: readonly PositionedText[]): Map<Island, ViewLabel> {
  const out = new Map<Island, ViewLabel>();
  for (const t of notes) {
    const word = t.text.trim().toUpperCase().replace(/\s+VIEW$/, '').replace(/^VIEW\s+/, '');
    const name = LABELS[word];
    if (!name) continue;
    const cx = t.x + t.dir[0] * t.widthMm / 2;
    let best: Island | null = null;
    let bestGap = Infinity;
    for (const is of islands) {
      const box = is.bbox;
      if (cx < box.x0 - 5 || cx > box.x1 + 5) continue;
      const below = t.y - box.y1;
      const above = box.y0 - t.y;
      const gap = below > 0 && below < 16 ? below : above > 0 && above < 8 ? above + 4 : Infinity;
      if (gap < bestGap) { bestGap = gap; best = is; }
    }
    if (best && !out.has(best)) out.set(best, { name, text: t.text });
  }
  return out;
}

const area = (b: BBox2): number => (b.x1 - b.x0) * (b.y1 - b.y0);

/** Axis maps for a view standing alone (no neighbour to orient against). */
const LONE_VIEW_AXES: Record<OrthoViewName, { u: AxisMap; v: AxisMap }> = {
  front: { u: { axis: 'x', sheetIndex: 0, sign: 1 }, v: { axis: 'z', sheetIndex: 1, sign: -1 } },
  top: { u: { axis: 'x', sheetIndex: 0, sign: 1 }, v: { axis: 'y', sheetIndex: 1, sign: -1 } },
  bottom: { u: { axis: 'x', sheetIndex: 0, sign: 1 }, v: { axis: 'y', sheetIndex: 1, sign: 1 } },
  left: { u: { axis: 'y', sheetIndex: 0, sign: -1 }, v: { axis: 'z', sheetIndex: 1, sign: -1 } },
  right: { u: { axis: 'y', sheetIndex: 0, sign: 1 }, v: { axis: 'z', sheetIndex: 1, sign: -1 } },
};

/**
 * Identify the orthographic views on a sheet.
 *
 * `projectionHint` is the angle read from the title block (or passed by the
 * caller); without one, third-angle is assumed and reported by the caller.
 */
export function identifyViews(
  paths: readonly ClassifiedPath[],
  notes: readonly PositionedText[],
  projectionHint: 'third' | 'first' | undefined,
): ViewSet {
  const projection = projectionHint ?? 'third';
  const islands = clusterIslands(paths);
  const pictorials: BBox2[] = [];
  const labels = assignLabels(islands, notes);
  const ortho: Array<Island & { label: ViewLabel | undefined }> = [];
  for (const is of islands) {
    const label = labels.get(is);
    if (label?.name === 'pictorial' || slantedFraction(is) > 0.35) {
      pictorials.push(is.bbox);
      continue;
    }
    ortho.push({ ...is, label });
  }
  const ambiguities: string[] = [];
  const unplaced: BBox2[] = [];
  if (ortho.length === 0) return { views: [], pictorials, unplaced, projection, ambiguities };

  const scaleTol = (a: BBox2, b: BBox2) => Math.max(0.3, 0.004 * Math.max(a.x1 - a.x0, a.y1 - a.y0, b.x1 - b.x0, b.y1 - b.y0));
  const alignedX = (a: BBox2, b: BBox2) => Math.abs(a.x0 - b.x0) <= scaleTol(a, b) && Math.abs(a.x1 - b.x1) <= scaleTol(a, b);
  const alignedY = (a: BBox2, b: BBox2) => Math.abs(a.y0 - b.y0) <= scaleTol(a, b) && Math.abs(a.y1 - b.y1) <= scaleTol(a, b);

  // Front: aligned both ways beats aligned one way; a FRONT label breaks ties.
  const scored = ortho.map((is, i) => {
    const vertical = ortho.filter((o, j) => j !== i && alignedX(o.bbox, is.bbox));
    const horizontal = ortho.filter((o, j) => j !== i && alignedY(o.bbox, is.bbox));
    const score = (vertical.length > 0 ? 2 : 0) + (horizontal.length > 0 ? 2 : 0) + (is.label?.name === 'front' ? 1 : 0);
    return { is, vertical, horizontal, score };
  });
  scored.sort((p, q) => q.score - p.score);
  const top = scored[0];
  if (scored.length > 1 && scored[1].score === top.score && top.score > 0 && top.score < 5) {
    ambiguities.push(`two views qualify equally as the front view (sheet boxes at x=${top.is.bbox.x0.toFixed(1)} and x=${scored[1].is.bbox.x0.toFixed(1)})`);
  }
  if (top.score < 2) {
    // Nothing aligns: a single-view sheet (or islands that are not a multiview
    // set). Use the biggest island, named by its caption when it has one, else
    // read as a plan view — the usual single view of a flat part.
    const lone = [...ortho].sort((p, q) => area(q.bbox) - area(p.bbox))[0];
    const name: OrthoViewName = lone.label && lone.label.name !== 'pictorial' ? lone.label.name : 'top';
    const axes = LONE_VIEW_AXES[name];
    for (const is of ortho) if (is !== lone) unplaced.push(is.bbox);
    return {
      views: [{
        name,
        bbox: lone.bbox,
        paths: lone.paths,
        ...axes,
        identifiedBy: lone.label && lone.label.name !== 'pictorial' ? 'label' : 'single-view',
        ...(lone.label ? { label: lone.label.text } : {}),
      }],
      pictorials,
      unplaced,
      projection,
      ambiguities,
    };
  }
  const front = top.is;
  const views: DrawingView[] = [{
    name: 'front',
    bbox: front.bbox,
    paths: front.paths,
    u: { axis: 'x', sheetIndex: 0, sign: 1 },
    v: { axis: 'z', sheetIndex: 1, sign: -1 },
    identifiedBy: 'alignment',
    ...(front.label ? { label: front.label.text } : {}),
  }];
  const placed = new Set<Island>([front]);

  const pick = (cands: typeof ortho, side: (b: BBox2) => boolean) =>
    cands.filter(c => !placed.has(c) && side(c.bbox)).sort((p, q) => bboxGap(p.bbox, front.bbox) - bboxGap(q.bbox, front.bbox))[0];

  const above = pick(top.vertical, b => b.y1 <= front.bbox.y0 + 0.5);
  const below = pick(top.vertical, b => b.y0 >= front.bbox.y1 - 0.5);
  const leftOf = pick(top.horizontal, b => b.x1 <= front.bbox.x0 + 0.5);
  const rightOf = pick(top.horizontal, b => b.x0 >= front.bbox.x1 - 0.5);

  const addPlan = (is: Island & { label: ViewLabel | undefined }, isAbove: boolean) => {
    const name: OrthoViewName = (projection === 'third') === isAbove ? 'top' : 'bottom';
    if (is.label && is.label.name !== name && is.label.name !== 'pictorial') {
      ambiguities.push(`view labelled '${is.label.text}' sits where a ${projection}-angle sheet puts the ${name} view`);
    }
    placed.add(is);
    views.push({
      name,
      bbox: is.bbox,
      paths: is.paths,
      u: { axis: 'x', sheetIndex: 0, sign: 1 },
      // Y grows away from the front view.
      v: { axis: 'y', sheetIndex: 1, sign: isAbove ? -1 : 1 },
      identifiedBy: 'alignment',
      ...(is.label ? { label: is.label.text } : {}),
    });
  };
  const addSide = (is: Island & { label: ViewLabel | undefined }, isLeftOf: boolean) => {
    const name: OrthoViewName = (projection === 'third') === isLeftOf ? 'left' : 'right';
    if (is.label && is.label.name !== name && is.label.name !== 'pictorial') {
      ambiguities.push(`view labelled '${is.label.text}' sits where a ${projection}-angle sheet puts the ${name} view`);
    }
    placed.add(is);
    views.push({
      name,
      bbox: is.bbox,
      paths: is.paths,
      u: { axis: 'y', sheetIndex: 0, sign: isLeftOf ? -1 : 1 },
      v: { axis: 'z', sheetIndex: 1, sign: -1 },
      identifiedBy: 'alignment',
      ...(is.label ? { label: is.label.text } : {}),
    });
  };
  if (above) addPlan(above, true);
  if (below) addPlan(below, false);
  if (leftOf) addSide(leftOf, true);
  if (rightOf) addSide(rightOf, false);

  for (const is of ortho) {
    if (!placed.has(is)) unplaced.push(is.bbox);
  }
  return { views, pictorials, unplaced, projection, ambiguities };
}

/** Model coordinate (mm, relative to the view's own min corner) of a sheet point. */
export function sheetToModel(view: DrawingView, p: readonly [number, number], sheetPerModel: number): { u: number; v: number } {
  const coord = (m: AxisMap) => {
    const lo = m.sheetIndex === 0 ? view.bbox.x0 : view.bbox.y0;
    const hi = m.sheetIndex === 0 ? view.bbox.x1 : view.bbox.y1;
    const s = p[m.sheetIndex];
    return (m.sign === 1 ? s - lo : hi - s) / sheetPerModel;
  };
  return { u: coord(view.u), v: coord(view.v) };
}

/** Sheet bbox of an island in model units along each of the view's axes. */
export function viewExtents(view: DrawingView, sheetPerModel: number): { u: number; v: number } {
  return {
    u: (view.bbox.x1 - view.bbox.x0) / sheetPerModel,
    v: (view.bbox.y1 - view.bbox.y0) / sheetPerModel,
  };
}

