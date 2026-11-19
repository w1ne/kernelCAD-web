// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Merge same-domain faces and edges of a solid, carrying face and edge lineage
 * across by geometric containment.
 *
 * The history-aware booleans skip OCCT's `SimplifyResult` so their face and
 * edge history stays exact (historyAwareBooleans.ts). A union of operands that
 * share a plane therefore keeps the seam: a coplanar face split in two, and
 * the convex edge along it cut into collinear pieces that meet a smooth
 * (180°) seam edge at one vertex. `BRepFilletAPI_MakeFillet` cannot blend
 * through such a vertex, at any radius. The edge-feature lowerer calls this
 * after a failed attempt and retries on the merged solid.
 *
 * `BRepTools_History` is not bound in the WASM build, so lineage is carried
 * by geometry: an input face or edge whose hash disappears maps to the new
 * face or edge that contains it.
 */

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { Edge, Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { brepExtremaDistance } from './brepDistance';

/** Above this many faces the merge is skipped: `ShapeUpgrade_UnifySameDomain`
 *  with face unify did not finish in minutes on large B-spline solids in this
 *  WASM build (faceEdit.ts measures the same limit). */
export const MAX_UNIFY_FACES = 256;

/** Containment tolerance (mm). The merge keeps geometry; the pieces of a
 *  merged face or edge lie on the result exactly up to vertex tolerance. */
const CONTAIN_TOL = 1e-5;

const HASH_UPPER = 2147483647;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hashOf = (shape: any): string => (shape.wrapped ?? shape).HashCode(HASH_UPPER).toString(16);

export interface UnifiedEdgeFeatureBase {
  /** The merged solid, with remapped face and edge lineage. */
  base: OcctBackend;
  /** The requested edges as edges of `base`, in order, without duplicates. */
  edges: Edge[];
  /** Faces and edges of the input before the merge, for reporting. */
  before: { faces: number; edges: number };
  after: { faces: number; edges: number };
}

interface ShapeLists {
  faces: Face[];
  edges: Edge[];
}

/**
 * Merge same-domain faces/edges of `base` and map `edges` onto the result.
 * Returns undefined when the merge changes nothing, is skipped for size, or
 * fails — the caller keeps the input.
 */
export function unifySameDomainForEdgeFeature(
  base: OcctBackend,
  edges: readonly Edge[],
): UnifiedEdgeFeatureBase | undefined {
  const input = base.getReplicadShape() as unknown as ShapeLists & { wrapped: unknown };
  const beforeFaces = input.faces;
  if (beforeFaces.length > MAX_UNIFY_FACES) return undefined;
  const beforeEdges = input.edges;
  const merged = runUnify(input.wrapped);
  if (merged === undefined) return undefined;
  const result = merged as unknown as ShapeLists;
  const afterFaces = result.faces;
  const afterEdges = result.edges;
  if (afterFaces.length === beforeFaces.length && afterEdges.length === beforeEdges.length) {
    return undefined;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const faceImage = imageMap(beforeFaces, afterFaces, (o, n) => faceContainedIn(oc, o, n), faceTieBreak(oc));
  const edgeImage = imageMap(beforeEdges, afterEdges, (o, n) => edgeContainedIn(oc, o, n));
  const out = new OcctBackend(merged, undefined, remapLineage(base.historyMap, faceImage));
  if (base.edgeHistoryMap) out.edgeHistoryMap = remapLineage(base.edgeHistoryMap, edgeImage);

  const byHash = new Map(afterEdges.map((e) => [hashOf(e), e] as const));
  const mapped: Edge[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    const target = edgeImage.get(hashOf(e)) ?? hashOf(e);
    const image = byHash.get(target);
    // An edge with no image was a seam inside a merged face: it is gone.
    if (!image || seen.has(target)) continue;
    seen.add(target);
    mapped.push(image);
  }
  return {
    base: out,
    edges: mapped,
    before: { faces: beforeFaces.length, edges: beforeEdges.length },
    after: { faces: afterFaces.length, edges: afterEdges.length },
  };
}

function runUnify(shape: unknown): replicad.Shape3D | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unify: any;
  try {
    unify = new oc.ShapeUpgrade_UnifySameDomain_2(shape, true, true, false);
    unify.AllowInternalEdges(false);
    unify.Build();
    // Pin the result before the unifier is deleted.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return replicad.cast(unify.Shape() as any) as replicad.Shape3D;
  } catch {
    return undefined;
  } finally {
    unify?.delete?.();
  }
}

/**
 * Input hash → result hash for every input sub-shape whose hash is gone,
 * matched against the result sub-shapes that are new. Unchanged sub-shapes
 * keep their hash and need no entry.
 */
function imageMap<T>(
  before: readonly T[],
  after: readonly T[],
  contains: (old: T, neu: T) => boolean,
  tieBreak?: (old: T, candidates: readonly T[]) => T,
): Map<string, string> {
  const afterHashes = new Set(after.map(hashOf));
  const beforeHashes = new Set(before.map(hashOf));
  const fresh = after.filter((s) => !beforeHashes.has(hashOf(s)));
  const out = new Map<string, string>();
  for (const old of before) {
    const h = hashOf(old);
    if (afterHashes.has(h)) continue;
    const hits = fresh.filter((n) => contains(old, n));
    if (hits.length === 0) continue;
    const pick = hits.length === 1 || !tieBreak ? hits[0]! : tieBreak(old, hits);
    out.set(h, hashOf(pick));
  }
  return out;
}

function remapLineage<L>(map: Map<string, L> | undefined, image: Map<string, string>): Map<string, L> | undefined {
  if (!map) return undefined;
  const out = new Map<string, L>();
  // Earliest input wins on a merged child, like the boolean history merge.
  for (const [hash, lineage] of map) {
    const target = image.get(hash) ?? hash;
    if (!out.has(target)) out.set(target, lineage);
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vertexAt(oc: any, p: { x: number; y: number; z: number }): unknown {
  const pnt = new oc.gp_Pnt_3(p.x, p.y, p.z);
  const mk = new oc.BRepBuilderAPI_MakeVertex(pnt);
  try {
    return mk.Vertex();
  } finally {
    mk.delete();
    pnt.delete();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function distanceTo(oc: any, point: { x: number; y: number; z: number }, shape: unknown): number {
  const v = vertexAt(oc, point) as { delete?: () => void };
  try {
    return brepExtremaDistance(oc, v, shape) ?? Infinity;
  } finally {
    v.delete?.();
  }
}

/** The old edge lies on the new one: both ends and its middle are on it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function edgeContainedIn(oc: any, old: Edge, neu: Edge): boolean {
  try {
    if (old.geomType !== neu.geomType) return false;
    const n = (neu as unknown as { wrapped: unknown }).wrapped;
    return [old.startPoint, old.pointAt(0.5), old.endPoint].every((p) => distanceTo(oc, p, n) <= CONTAIN_TOL);
  } catch {
    return false;
  }
}

/** The old face touches the new one and lies on the same kind of surface.
 *  Faces that only share a boundary are told apart by `faceTieBreak`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function faceContainedIn(oc: any, old: Face, neu: Face): boolean {
  try {
    if (old.geomType !== neu.geomType) return false;
    const d = brepExtremaDistance(
      oc,
      (old as unknown as { wrapped: unknown }).wrapped,
      (neu as unknown as { wrapped: unknown }).wrapped,
    );
    return d !== undefined && d <= CONTAIN_TOL;
  } catch {
    return false;
  }
}

/** Among several touching candidates, the one nearest the old face's centre. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function faceTieBreak(oc: any): (old: Face, candidates: readonly Face[]) => Face {
  return (old, candidates) => {
    let best = candidates[0]!;
    let bestD = Infinity;
    const c = old.center;
    for (const n of candidates) {
      const d = distanceTo(oc, c, (n as unknown as { wrapped: unknown }).wrapped);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  };
}
