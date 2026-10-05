// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/viewerDimensions/drawingAnnotation.ts
//
// A `shape.dimension()` declaration as an engineering-drawing annotation.
// Linear ends resolve with the viewer's rule (a circular edge is its centre),
// the label is a name printed before the computed value, and the dimension
// goes on the orthographic view that shows it at its truest size.

import type { Edge } from 'replicad';
import type { DrawingDimensionSpec } from '../../../../shared/intent/drawingGdtRecord';
import type { DrawingAnnotation } from '../drawingAnnotations';
import type { DrawingViewName } from '../drawingLayout';
import { viewBasis } from '../drawingProjection';
import { oneEdge } from '../drawingAnchors';
import type { WorldFramePart } from '../sceneToWorldFrame';
import { dimensionEnd } from './declared';
import type { V3 } from './types';
import { cross, dot, sub } from './vec';

/** Orthographic views in tie-break order. */
const VIEWS: readonly DrawingViewName[] = ['front', 'top', 'left'];

const pt = (p: { x: number; y: number; z: number }): V3 => [p.x, p.y, p.z];

/** The view where `v` projects longest (front on a tie). */
export function longestView(v: V3): DrawingViewName {
  return pickView((b) => Math.hypot(dot(v, b.x), dot(v, b.y)));
}

/** The view looking most squarely along `normal` (front on a tie). */
export function facingView(normal: V3): DrawingViewName {
  return pickView((b) => Math.abs(dot(normal, cross(b.x, b.y))));
}

function pickView(score: (basis: { x: V3; y: V3 }) => number): DrawingViewName {
  let best = VIEWS[0];
  let bestScore = -Infinity;
  for (const view of VIEWS) {
    const s = score(viewBasis(view));
    if (s > bestScore + 1e-9) {
      best = view;
      bestScore = s;
    }
  }
  return best;
}

const direction = (e: Edge): V3 => sub(pt(e.endPoint), pt(e.startPoint));

function annotationFor(parts: readonly WorldFramePart[], d: DrawingDimensionSpec, role: string): DrawingAnnotation {
  const prefix = d.label !== undefined ? { prefix: d.label } : {};
  if (d.kind === 'linear') {
    const from = dimensionEnd(parts, d.from, `${role}.from`);
    const to = dimensionEnd(parts, d.to, `${role}.to`);
    return { kind: 'linear', from, to, view: longestView(sub(to, from)), ...prefix };
  }
  if (d.kind === 'angular') {
    const normal = cross(direction(oneEdge(parts, d.from, `${role}.from`)), direction(oneEdge(parts, d.to, `${role}.to`)));
    return { kind: 'angular', from: d.from, to: d.to, view: facingView(normal), ...prefix };
  }
  const edge = oneEdge(parts, d.edge, `${role}.edge`);
  const normal = cross(sub(pt(edge.pointAt(0.25)), pt(edge.pointAt(0))), sub(pt(edge.pointAt(0.5)), pt(edge.pointAt(0))));
  return { kind: d.kind, edge: d.edge, view: facingView(normal), ...prefix };
}

/**
 * The drawing annotation for one declared dimension. When its geometry does
 * not resolve here, the query is passed through unresolved so the sheet
 * renderer reports it the way it reports any authored annotation.
 */
export function declaredDrawingAnnotation(
  parts: readonly WorldFramePart[],
  d: DrawingDimensionSpec,
  index = 0,
): DrawingAnnotation {
  try {
    return annotationFor(parts, d, `dimensions[${index}]`);
  } catch {
    const prefix = d.label !== undefined ? { prefix: d.label } : {};
    if (d.kind === 'linear') return { kind: 'linear', from: d.from as never, to: d.to as never, ...prefix };
    if (d.kind === 'angular') return { kind: 'angular', from: d.from, to: d.to, ...prefix };
    return { kind: d.kind, edge: d.edge, ...prefix };
  }
}
