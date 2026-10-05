// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/viewerDimensions/auto.ts
//
// Automatic 3D viewer dimensions from B-rep feature recognition. Each rule
// is one small function; `autoDimensions` concatenates them in priority
// order (overall > holes > spacing > radii > chamfers) and caps the result
// at 20 per body. Hole bores never appear as radii: the recogniser already
// claims them as holes.

import { getOC } from 'replicad';
import type { WorldFramePart } from '../sceneToWorldFrame';
import {
  recogniseDrawingFeatures,
  type ChamferFeature,
  type DrawingFeatureModel,
  type HoleComposite,
  type RadiusFeature,
} from '../drawingFeatures';
import type { V3, ViewerDimension } from './types';
import { formatMm, groupLabel } from '../../../../shared/intent/viewerDimensionFormat';
import { add, cross, dot, perpendicular, scale, sub, unit } from './vec';

/** Auto dimensions per body, overall extents included. */
export const MAX_AUTO_PER_BODY = 20;
/** Above this part count an assembly gets overall extents only. */
export const MAX_DIMENSIONED_PARTS = 8;

/** A rule's output before it is stamped with id / source / part. */
type Draft = Omit<ViewerDimension, 'id' | 'source' | 'part'>;

/** Called before and after each rule; throws when the budget is spent. */
export type Checkpoint = () => void;

const PARALLEL = 0.999;
const ALIGN_TOL = 0.01;

/** Group items by a label key, keeping first-appearance order. */
function groupBy<T>(items: readonly T[], key: (t: T) => string): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const g = groups.get(k);
    if (g) g.push(it);
    else groups.set(k, [it]);
  }
  return [...groups];
}

// ---------------------------------------------------------------------------
// Overall extents
// ---------------------------------------------------------------------------

type Box3 = { min: readonly number[]; max: readonly number[] };
type OcPnt = { X(): number; Y(): number; Z(): number; delete(): void };
type OcBox = { IsVoid(): boolean; CornerMin(): OcPnt; CornerMax(): OcPnt; delete(): void };

/**
 * The exact box of one part from its geometry (BRepBndLib::AddOptimal).
 * The default Bnd_Box is padded on curved B-spline faces (control-point
 * hull) and the tessellated box falls short on curved faces (a Ø100 sphere
 * reads 99.9), so neither gives a true overall size. Falls back to the
 * tessellated box when the optimal pass is unavailable.
 */
function exactBox(part: WorldFramePart): Box3 {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw OCCT bindings are untyped
  const oc = getOC() as any;
  let box: OcBox | undefined;
  try {
    const b: OcBox = new oc.Bnd_Box_1();
    box = b;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- replicad wrapper
    oc.BRepBndLib.AddOptimal((part.shape.getReplicadShape() as any).wrapped, b, false, false);
    if (!b.IsVoid()) {
      const lo = b.CornerMin();
      const hi = b.CornerMax();
      const out = { min: [lo.X(), lo.Y(), lo.Z()], max: [hi.X(), hi.Y(), hi.Z()] };
      lo.delete();
      hi.delete();
      return out;
    }
  } catch {
    // fall through to the tessellated box
  } finally {
    box?.delete();
  }
  return part.shape.boundingBox({ exact: true });
}

function unionBounds(parts: readonly WorldFramePart[]): Box3 {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const bb = exactBox(p);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], bb.min[k]);
      max[k] = Math.max(max[k], bb.max[k]);
    }
  }
  return { min, max };
}

/** Three linear dimensions along the edges of the exact union box. */
export function overallExtents(parts: readonly WorldFramePart[]): Draft[] {
  const { min: [x0, y0, z0], max: [x1, y1, z1] } = unionBounds(parts);
  const edges: Array<[V3, V3]> = [
    [[x0, y0, z0], [x1, y0, z0]],
    [[x1, y0, z0], [x1, y1, z0]],
    [[x1, y0, z0], [x1, y0, z1]],
  ];
  return edges.map(([a, b]) => ({ kind: 'linear', a, b, text: formatMm(Math.hypot(...sub(b, a))) }));
}

// ---------------------------------------------------------------------------
// Holes and their spacing
// ---------------------------------------------------------------------------

/** One diameter callout per hole size, at the first hole of the size. */
export function holeDims(model: DrawingFeatureModel): Draft[] {
  return groupBy(model.holes, h => formatMm(h.diameter)).map(([d, holes]) => {
    const h = holes[0];
    const across = scale(perpendicular(h.axis), h.diameter / 2);
    return {
      kind: 'diameter',
      a: sub(h.entry, across),
      b: add(h.entry, across),
      centre: h.entry,
      axis: h.axis,
      text: groupLabel(holes.length, `Ø${d}`),
    };
  });
}

const WORLD_AXES: readonly V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/** First pair of holes aligned on `other` with the smallest non-zero
 *  centre distance along `dir`. */
function closestAlignedPair(holes: readonly HoleComposite[], dir: V3, other: V3): Draft | null {
  let best: { d: number; i: number; j: number } | null = null;
  for (let i = 0; i < holes.length; i++) {
    for (let j = i + 1; j < holes.length; j++) {
      const delta = sub(holes[j].entry, holes[i].entry);
      if (Math.abs(dot(delta, other)) > ALIGN_TOL) continue;
      const d = Math.abs(dot(delta, dir));
      if (d > ALIGN_TOL && (best === null || d < best.d - 1e-9)) best = { d, i, j };
    }
  }
  if (best === null) return null;
  return { kind: 'linear', a: holes[best.i].entry, b: holes[best.j].entry, text: formatMm(best.d) };
}

/** Spacing for holes sharing one axis direction: at most one linear
 *  dimension along each in-plane world axis. Off-axis holes are skipped. */
function spacingForAxisGroup(holes: readonly HoleComposite[]): Draft[] {
  const inPlane = WORLD_AXES.filter(w => Math.abs(dot(w, holes[0].axis)) < PARALLEL);
  if (inPlane.length !== 2) return [];
  const out: Draft[] = [];
  for (const [dir, other] of [[inPlane[0], inPlane[1]], [inPlane[1], inPlane[0]]]) {
    const pair = closestAlignedPair(holes, dir, other);
    if (pair) out.push(pair);
  }
  return out;
}

export function spacingDims(model: DrawingFeatureModel): Draft[] {
  const groups: HoleComposite[][] = [];
  for (const h of model.holes) {
    const g = groups.find(gr => Math.abs(dot(gr[0].axis, h.axis)) > PARALLEL);
    if (g) g.push(h);
    else groups.push([h]);
  }
  return groups.filter(g => g.length > 1).flatMap(spacingForAxisGroup);
}

// ---------------------------------------------------------------------------
// Radii and chamfers
// ---------------------------------------------------------------------------

/** Radius callout from the arc centre (from the recogniser) to the arc point. */
function radiusDraft(f: RadiusFeature, count: number): Draft {
  return {
    kind: 'radius',
    a: f.centre,
    b: f.arcPoint,
    centre: f.centre,
    axis: f.axis,
    text: groupLabel(count, `R${formatMm(f.radius)}`),
  };
}

export function radiusDims(model: DrawingFeatureModel): Draft[] {
  return groupBy(model.radii, r => formatMm(r.radius)).map(([, feats]) => radiusDraft(feats[0], feats.length));
}

function chamferText(c: ChamferFeature): string {
  const [l0, l1] = c.legs.map(formatMm);
  return l0 === l1 ? `${l0}×45°` : `${l0}×${l1}`;
}

/** One linear callout per chamfer size, across the chamfer strip. No count
 *  prefix: `4× 2×45°` reads as a multiplication. */
export function chamferDims(model: DrawingFeatureModel): Draft[] {
  return groupBy(model.chamfers, chamferText).map(([text, [c]]) => {
    const across = scale(unit(cross(c.normal, c.edgeDir)), Math.hypot(c.legs[0], c.legs[1]) / 2);
    return { kind: 'linear', a: sub(c.midPoint, across), b: add(c.midPoint, across), text };
  });
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function stamp(rule: string, partKey: string, drafts: readonly Draft[], part?: string): ViewerDimension[] {
  return drafts.map((d, i) => ({
    ...d,
    id: `auto:${rule}:${partKey}:${i}`,
    source: 'auto',
    ...(part !== undefined ? { part } : {}),
  }));
}

/** Feature rules for one part, in priority order, each behind a checkpoint.
 *  Results are appended to `out` as each rule completes (at most `cap`), so
 *  a budget overrun keeps everything finished before it. */
function partFeatureDims(
  part: WorldFramePart,
  tag: string | undefined,
  checkpoint: Checkpoint,
  out: ViewerDimension[],
  cap: number,
): void {
  checkpoint();
  const model = recogniseDrawingFeatures(part.shape, { checkpoint });
  checkpoint();
  const rules: Array<[string, () => Draft[]]> = [
    ['holes', () => holeDims(model)],
    ['spacing', () => spacingDims(model)],
    ['radii', () => radiusDims(model)],
    ['chamfers', () => chamferDims(model)],
  ];
  let left = cap;
  for (const [rule, run] of rules) {
    const dims = stamp(rule, part.name, run(), tag).slice(0, Math.max(0, left));
    out.push(...dims);
    left -= dims.length;
    checkpoint();
  }
}

/** Overall extents of the whole model. Bounding boxes only, so it runs
 *  outside the budget and every result carries it. */
export function overallDimensions(parts: readonly WorldFramePart[]): ViewerDimension[] {
  return stamp('overall', 'model', overallExtents(parts));
}

/**
 * Per-part feature dimensions, appended to `out`, when the model has at most
 * eight parts. Each body's list is capped at 20 including the `overallCount`
 * overall extents. Appending (rather than returning) keeps completed rules
 * when a checkpoint throws on budget overrun.
 */
export function featureDimensions(
  parts: readonly WorldFramePart[],
  overallCount: number,
  checkpoint: Checkpoint,
  out: ViewerDimension[],
): void {
  if (parts.length > MAX_DIMENSIONED_PARTS) return;
  const multi = parts.length > 1;
  for (const p of parts) partFeatureDims(p, multi ? p.name : undefined, checkpoint, out, MAX_AUTO_PER_BODY - overallCount);
}
