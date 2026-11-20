// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rim edge refs for `hole` / `holes`. A rim is an edge the cut created where a
// hole face meets the body (`entry-rim`, `exit-rim`) or where the bore wall
// meets a flat floor (`floor-rim`). The label goes on the edge lineage, so
// `chamfer(r, { face: 'pilot.entry-rim' })` and
// `q.edge(q.derivedFrom(id)).and(q.withLabel('entry-rim'))` resolve them.

import type { Edge, Face } from 'replicad';
import type { Vec3, FeatureKind } from '../../../shared/intent/types';
import type { EdgeHistoryMap, HistoryMap } from '../../naming/evolutionRecord';
import { faceHashOf } from './createdRefs';
import type { BoreFrame } from './holeClassifier';

export type HoleRimName = 'entry-rim' | 'exit-rim' | 'floor-rim';

const HASH_UPPER = 2147483647;
/** An edge this close to parallel with the bore axis is a breakout seam, not a rim. */
const AXIAL_TANGENT_MAX = 0.9;

function edgeHash(edge: Edge): string {
  const wrapped = (edge as unknown as { wrapped: { HashCode(upper: number): number } }).wrapped;
  return wrapped.HashCode(HASH_UPPER).toString(16);
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function unit(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function offAxis(p: Vec3, bore: BoreFrame): { along: number; radial: number } {
  const axis = unit(bore.axisIntoBody);
  const d: Vec3 = [p[0] - bore.entryPoint[0], p[1] - bore.entryPoint[1], p[2] - bore.entryPoint[2]];
  const along = dot(d, axis);
  const radial = Math.hypot(d[0] - along * axis[0], d[1] - along * axis[1], d[2] - along * axis[2]);
  return { along, radial };
}

/** The bore whose axis the point is nearest; holes() cuts several in one boolean. */
function nearestBore(p: Vec3, bores: readonly BoreFrame[]): BoreFrame {
  let best = bores[0];
  let bestRadial = Infinity;
  for (const bore of bores) {
    const { radial } = offAxis(p, bore);
    if (radial < bestRadial) {
      bestRadial = radial;
      best = bore;
    }
  }
  return best;
}

function rimOf(edge: Edge, adjacent: ReadonlySet<string>, bores: readonly BoreFrame[]): HoleRimName | null {
  if (adjacent.has('wall') && adjacent.has('floor')) return 'floor-rim';
  // A rim joins exactly one hole face to the body it was cut from.
  const holeFaces = [...adjacent].filter((label) => label !== 'body');
  if (!adjacent.has('body') || holeFaces.length !== 1) return null;
  const mid = edge.pointAt(0.5);
  const p: Vec3 = [mid.x, mid.y, mid.z];
  const bore = nearestBore(p, bores);
  const t = edge.tangentAt(0.5);
  if (Math.abs(dot(unit([t.x, t.y, t.z]), unit(bore.axisIntoBody))) > AXIAL_TANGENT_MAX) return null;
  const { along } = offAxis(p, bore);
  if (along <= bore.effectiveDepth / 2) return 'entry-rim';
  return bore.through ? 'exit-rim' : null;
}

interface EdgeFaces {
  edge: Edge;
  /** Hole ref of each adjacent face, or `body` for a face the cut kept. */
  labels: Set<string>;
}

function edgeAdjacency(faces: readonly Face[], historyMap: HistoryMap, featureId: string): Map<string, EdgeFaces> {
  const out = new Map<string, EdgeFaces>();
  for (const face of faces) {
    const lineage = historyMap.get(faceHashOf(face));
    const label = lineage?.featureId === featureId && lineage.labelName ? lineage.labelName : 'body';
    for (const edge of (face as unknown as { edges: Edge[] }).edges) {
      const hash = edgeHash(edge);
      const entry = out.get(hash) ?? { edge, labels: new Set<string>() };
      entry.labels.add(label);
      out.set(hash, entry);
    }
  }
  return out;
}

/**
 * Label the rim edges the hole cut created. `historyMap` must already carry
 * the hole's face refs; only edges born on `feature.id` are labelled, so an
 * edge the body already had keeps its own label.
 */
export function labelHoleRims(
  faces: readonly Face[],
  historyMap: HistoryMap,
  edgeHistoryMap: EdgeHistoryMap,
  bores: readonly BoreFrame[],
  feature: { id: string; kind: FeatureKind; name?: string; ordinal?: number },
): void {
  if (bores.length === 0) return;
  for (const [hash, { edge, labels }] of edgeAdjacency(faces, historyMap, feature.id)) {
    const lineage = edgeHistoryMap.get(hash);
    if (!lineage || lineage.featureId !== feature.id || lineage.rootFeatureId !== feature.id) continue;
    const rim = rimOf(edge, labels, bores);
    if (rim === null) continue;
    edgeHistoryMap.set(hash, {
      ...lineage,
      labelName: rim,
      featureKind: feature.kind,
      ...(feature.name !== undefined ? { featureName: feature.name } : {}),
      ...(feature.ordinal !== undefined ? { featureOrdinal: feature.ordinal } : {}),
    });
  }
}
