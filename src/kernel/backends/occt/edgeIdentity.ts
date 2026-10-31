// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Edge } from 'replicad';

/** Quantization tolerance in model units used by the persistent edge ID. */
export const EDGE_ID_TOLERANCE = 1e-6;
const HASH_UPPER = 2147483647;

type Point = { x: number; y: number; z: number };
type EdgeLike = Pick<Edge, 'pointAt' | 'length'> & { geomType?: string };

function quantize(value: number): number {
  return Math.round(value / EDGE_ID_TOLERANCE);
}

function comparePoint(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < 3; i += 1) {
    const delta = a[i]! - b[i]!;
    if (delta !== 0) return delta;
  }
  return 0;
}

/**
 * Geometry fingerprint used for persistent edge IDs. It combines the exact
 * curve kind, length and nine evenly spaced 3D samples, quantized to 1e-6
 * model units. Sorting the samples makes the identity independent of edge
 * orientation and traversal order. Geometry changes beyond the tolerance
 * produce a new ID; geometrically coincident edges deliberately share an ID
 * and are rejected as ambiguous by the resolver.
 */
export function edgeGeometryFingerprint(edge: EdgeLike): string {
  const points: number[][] = [];
  for (let i = 0; i <= 8; i += 1) {
    const point = edge.pointAt(i / 8) as Point;
    points.push([quantize(point.x), quantize(point.y), quantize(point.z)]);
  }
  points.sort(comparePoint);
  const curveType = edge.geomType ?? 'OTHER';
  return `${curveType}|${quantize(edge.length)}|${points.map(p => p.join(',')).join(';')}`;
}

function fnv1a(value: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function stableEdgeIdForEdge(edge: EdgeLike): string {
  const fingerprint = edgeGeometryFingerprint(edge);
  return `s${fnv1a(fingerprint, 0x811c9dc5)}${fnv1a(fingerprint, 0x9e3779b9)}`;
}

export type StableEdgeResolution =
  | { status: 'unique'; edge: Edge }
  | { status: 'missing' }
  | { status: 'ambiguous'; matches: number };

/** Resolve a persistent edge ID only when exactly one current BREP edge matches. */
export function resolveStableEdgeId(edges: readonly Edge[], id: string): StableEdgeResolution {
  const matches = edges.filter(edge => stableEdgeIdForEdge(edge) === id);
  if (matches.length === 0) return { status: 'missing' };
  if (matches.length > 1) return { status: 'ambiguous', matches: matches.length };
  return { status: 'unique', edge: matches[0]! };
}

/** OCCT hash used by replicad's meshEdges edgeGroups. */
export function occtEdgeHash(edge: Edge): number | null {
  try {
    const wrapped = (edge as unknown as { wrapped?: { HashCode?: (upper: number) => number } }).wrapped;
    return typeof wrapped?.HashCode === 'function' ? wrapped.HashCode(HASH_UPPER) : null;
  } catch {
    return null;
  }
}
