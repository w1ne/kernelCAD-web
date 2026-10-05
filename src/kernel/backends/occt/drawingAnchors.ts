// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAnchors.ts
//
// Anchor and edge/face resolution shared by the 2D drawing annotations and
// the 3D viewer dimensions. Moved verbatim out of drawingAnnotations.ts so
// both surfaces resolve the same query to the same point.

import type { Edge, Face } from 'replicad';
import type { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery } from './edgeQueries';
import type { Vec3 } from '../../../shared/intent/types';
import type { EdgeQuery, FaceQuery } from '../../../shared/intent/queryTypes';
import type { WorldFramePart } from './sceneToWorldFrame';

/**
 * Where an annotation attaches. Either an explicit model-space point, or a
 * query naming geometry the way every other kernelCAD selector does.
 * An edge resolves to its curve midpoint, a face to its centre.
 */
export type DrawingAnchor =
  | Vec3
  | { edge: EdgeQuery }
  | { face: FaceQuery };

const isVec3 = (a: DrawingAnchor): a is Vec3 =>
  Array.isArray(a) && a.length === 3 && a.every(n => typeof n === 'number');

/**
 * Resolve a query across every part on the sheet. Parts arrive in world frame,
 * so a query is answered against the same coordinates the projection sees.
 * Matches are pooled across parts because the author addresses "the sheet",
 * not "part 3".
 */
function resolveAcrossParts<Q, R>(
  parts: readonly WorldFramePart[],
  query: Q,
  resolve: (shape: OcctBackend, q: Q) => R[],
): R[] {
  const out: R[] = [];
  for (const p of parts) {
    try {
      out.push(...resolve(p.shape as OcctBackend, query));
    } catch {
      // A query key that a particular part's topology cannot answer (e.g. a
      // face type that body has none of) is not an error for the sheet — the
      // caller's "zero total matches" check is the real gate.
    }
  }
  return out;
}

export class Unresolved extends Error {}

export const fail = (why: string): never => {
  throw new Unresolved(why);
};

export function oneEdge(parts: readonly WorldFramePart[], q: EdgeQuery, role: string): Edge {
  const matches = resolveAcrossParts(parts, q, resolveEdgeQuery);
  if (matches.length === 0) fail(`${role}: no edge matched ${JSON.stringify(q)}`);
  // `near` is the documented disambiguator throughout the selector API — it
  // sorts closest-first, so honouring it here keeps the same contract.
  if (matches.length > 1 && q.near === undefined) {
    fail(`${role}: ${matches.length} edges matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

export function oneFace(parts: readonly WorldFramePart[], q: FaceQuery, role: string): Face {
  const matches = resolveAcrossParts(parts, q, resolveFaceQuery);
  if (matches.length === 0) fail(`${role}: no face matched ${JSON.stringify(q)}`);
  if (matches.length > 1 && q.near === undefined) {
    fail(`${role}: ${matches.length} faces matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

/**
 * Curve midpoint of an edge. Deliberately `pointAt(0.5)` rather than the
 * endpoint average used by the selector summary: for a CLOSED circular edge
 * the endpoints coincide, so the endpoint average degenerates to a single
 * point on the rim and an annotation anchored there would sit in the wrong
 * place entirely.
 */
export function edgeMid(e: Edge): Vec3 {
  const p = e.pointAt(0.5);
  return [p.x, p.y, p.z];
}

export class UnresolvedWithCode extends Error {
  readonly code: 'drawing.datum.unresolved' | 'drawing.tolerance.feature-unresolved';
  constructor(code: 'drawing.datum.unresolved' | 'drawing.tolerance.feature-unresolved', message: string) {
    super(message);
    this.code = code;
  }
}

export const failCode = (code: UnresolvedWithCode['code'], why: string): never => {
  throw new UnresolvedWithCode(code, why);
};

export function oneFaceCoded(
  parts: readonly WorldFramePart[],
  q: FaceQuery,
  role: string,
  code: UnresolvedWithCode['code'],
): Face {
  const matches = resolveAcrossParts(parts, q, resolveFaceQuery);
  if (matches.length === 0) return failCode(code, `${role}: no face matched ${JSON.stringify(q)}`);
  if (matches.length > 1 && q.near === undefined) {
    return failCode(code, `${role}: ${matches.length} faces matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

export function oneEdgeCoded(
  parts: readonly WorldFramePart[],
  q: EdgeQuery,
  role: string,
  code: UnresolvedWithCode['code'],
): Edge {
  const matches = resolveAcrossParts(parts, q, resolveEdgeQuery);
  if (matches.length === 0) return failCode(code, `${role}: no edge matched ${JSON.stringify(q)}`);
  if (matches.length > 1 && q.near === undefined) {
    return failCode(code, `${role}: ${matches.length} edges matched ${JSON.stringify(q)} — add 'near' or a tighter query`);
  }
  return matches[0];
}

export function resolveAnchor(
  parts: readonly WorldFramePart[],
  anchor: DrawingAnchor,
  role: string,
): Vec3 {
  if (isVec3(anchor)) return anchor;
  if ('edge' in anchor) return edgeMid(oneEdge(parts, anchor.edge, role));
  if ('face' in anchor) {
    const c = oneFace(parts, anchor.face, role).center;
    return [c.x, c.y, c.z];
  }
  return fail(`${role}: anchor must be a [x,y,z] point, { edge: … } or { face: … }`);
}

/**
 * Centre and radius of a circular edge, in model space.
 *
 * Solved from three points sampled on the curve (the circumcentre / circum-
 * radius of the triangle they form) — the same technique the selector's
 * `radius` summary uses, and it needs no OCCT symbol beyond `pointAt`.
 * Non-circular edges are rejected rather than approximated.
 */
export function circleOf(e: Edge, role: string): { center: Vec3; radius: number } {
  const geom = (e as unknown as { geomType?: string }).geomType;
  if (geom !== 'CIRCLE') {
    fail(`${role}: edge is a ${geom ?? 'UNKNOWN'}, not a CIRCLE — radius/diameter needs a circular edge`);
  }
  const a = e.pointAt(0);
  const b = e.pointAt(1 / 3);
  const c = e.pointAt(2 / 3);
  const A: Vec3 = [a.x, a.y, a.z];
  const ab: Vec3 = [b.x - a.x, b.y - a.y, b.z - a.z];
  const ac: Vec3 = [c.x - a.x, c.y - a.y, c.z - a.z];
  const n: Vec3 = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const n2 = n[0] * n[0] + n[1] * n[1] + n[2] * n[2];
  if (n2 < 1e-18) fail(`${role}: circular edge samples are collinear — cannot solve a centre`);
  const ab2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const ac2 = ac[0] * ac[0] + ac[1] * ac[1] + ac[2] * ac[2];
  // Circumcentre relative to A: (|ab|²·(ac×n) + |ac|²·(n×ab)) / 2|n|².
  const t1: Vec3 = [
    ac[1] * n[2] - ac[2] * n[1],
    ac[2] * n[0] - ac[0] * n[2],
    ac[0] * n[1] - ac[1] * n[0],
  ];
  const t2: Vec3 = [
    n[1] * ab[2] - n[2] * ab[1],
    n[2] * ab[0] - n[0] * ab[2],
    n[0] * ab[1] - n[1] * ab[0],
  ];
  const k = 1 / (2 * n2);
  const rel: Vec3 = [
    (ab2 * t1[0] + ac2 * t2[0]) * k,
    (ab2 * t1[1] + ac2 * t2[1]) * k,
    (ab2 * t1[2] + ac2 * t2[2]) * k,
  ];
  return {
    center: [A[0] + rel[0], A[1] + rel[1], A[2] + rel[2]],
    radius: Math.hypot(rel[0], rel[1], rel[2]),
  };
}
