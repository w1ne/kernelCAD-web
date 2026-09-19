// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/views.ts

import { viewBasis } from '../drawingProjection';
import type { PlanarFaceInfo, V3 } from '../drawingFeatures';
import type { DrawingViewName } from '../drawingLayout';
import { cross, dot, sub } from './vectors';

export const STANDARD_VIEWS: readonly DrawingViewName[] = ['front', 'top', 'left'];

function viewDirection(view: DrawingViewName): V3 {
  const b = viewBasis(view);
  return cross(b.x, b.y);
}

/** The standard view looking along `axis` (a hole or arc axis). */
export function viewAlong(axis: readonly number[]): DrawingViewName {
  let best: DrawingViewName = 'front';
  let bestDot = -1;
  for (const v of STANDARD_VIEWS) {
    const d = Math.abs(dot(viewDirection(v), axis));
    if (d > bestDot + 1e-9) { bestDot = d; best = v; }
  }
  return best;
}

export interface EdgeLine { view: DrawingViewName; a: V3; b: V3; normal: V3 }

/** The standard views where a planar face is seen edge-on, longest trace
 *  first, each with that trace as a model-space segment. */
export function edgeOnLines(face: PlanarFaceInfo): EdgeLine[] {
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
