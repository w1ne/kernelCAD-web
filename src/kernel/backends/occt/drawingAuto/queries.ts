// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/queries.ts

import type { Edge, Face } from 'replicad';
import { KernelError } from '../../../../shared/intent/kernelError';
import type { EdgeQuery, FaceQuery } from '../../../../shared/intent/queryTypes';
import type { OcctBackend } from '../occtBackend';
import { resolveEdgeQuery, resolveFaceQuery } from '../edgeQueries';
import type { PlanarFaceInfo } from '../drawingFeatures';
import type { WorldFramePart } from '../sceneToWorldFrame';
import { dot, len, sub } from './vectors';

function resolvePooled<Q, R>(
  parts: readonly WorldFramePart[],
  query: Q,
  resolve: (shape: OcctBackend, q: Q) => R[],
): R[] {
  const out: R[] = [];
  for (const p of parts) {
    try {
      out.push(...resolve(p.shape as OcctBackend, query));
    } catch {
      // A key one part's topology cannot answer is not a sheet-level error;
      // the zero-match check below is the gate.
    }
  }
  return out;
}

export function oneFace(
  parts: readonly WorldFramePart[],
  q: FaceQuery,
  role: string,
  code: 'drawing.datum.unresolved' | 'drawing.tolerance.feature-unresolved',
): Face {
  const m = resolvePooled(parts, q, resolveFaceQuery);
  if (m.length === 1 || (m.length > 1 && q.near !== undefined)) return m[0];
  throw new KernelError(
    code,
    `svg-drawing: ${role}: ${m.length === 0 ? 'no face matched' : `${m.length} faces matched`} ${JSON.stringify(q)}` +
      (m.length > 1 ? " — add 'near' or a tighter query" : ''),
    undefined,
    'Every declared datum and tolerance must resolve to exactly one face or edge of the exported geometry. ' +
      'Inspect it with list_faces / list_edges, then tighten the query or add near.',
  );
}

export function oneEdge(parts: readonly WorldFramePart[], q: EdgeQuery, role: string): Edge {
  const m = resolvePooled(parts, q, resolveEdgeQuery);
  if (m.length === 1 || (m.length > 1 && q.near !== undefined)) return m[0];
  throw new KernelError(
    'drawing.tolerance.feature-unresolved',
    `svg-drawing: ${role}: ${m.length === 0 ? 'no edge matched' : `${m.length} edges matched`} ${JSON.stringify(q)}` +
      (m.length > 1 ? " — add 'near' or a tighter query" : ''),
    undefined,
    'Every declared tolerance must resolve to exactly one face or edge of the exported geometry. ' +
      'Inspect it with list_edges, then tighten the query or add near.',
  );
}

export function matchPlanar(face: Face, planar: readonly PlanarFaceInfo[]): PlanarFaceInfo | null {
  if ((face as unknown as { geomType?: string }).geomType !== 'PLANE') return null;
  const n = face.normalAt();
  const nl = Math.hypot(n.x, n.y, n.z) || 1;
  const c = face.center;
  return planar.find(p =>
    dot(p.normal, [n.x / nl, n.y / nl, n.z / nl]) > 0.9999 &&
    len(sub(p.centre, [c.x, c.y, c.z])) < 1e-3) ?? null;
}
