// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/datums.ts

import { canonicalAxis } from '../drawingFeatures';
import type { DrawingFeatureModel, HoleComposite, PlanarFaceInfo, V3 } from '../drawingFeatures';
import { dot } from './vectors';

export interface Datum {
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

export function deriveDatums(
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
