// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/featureOwnership.ts
//
// Face / edge → owning feature attribution for one meshed feature. The Studio
// uses it to link a picked face or edge to the script call that made it, and
// a script call back to the faces it made.
//
// A face's owner is the feature whose call created it. Rules, in order:
//   1. The face lineage names a creating feature (`FaceLineage.featureId`,
//      stamped by labelled creators such as hole walls) → that feature.
//   2. The face is unchanged from an input (same OCCT hash as a face of a
//      predecessor shape) → the owner it had there.
//   3. The face is a modified copy of a face with lineage (for example a box
//      side trimmed by a fillet) → the lineage root feature.
//   4. Otherwise the face is new → this feature.
// A topology-preserving copy (an assembly part clones its source shape, so
// every hash changes) inherits its single predecessor's owners by face order
// instead: OCCT keeps explorer order across copy and rigid transforms, the
// same invariant `propagateTransformHistory` relies on.
// An edge belongs to the newest owner (in record order) of the faces that
// bound it: a hole's rim belongs to the hole, a fillet's tangent edges to
// the fillet.
//
// Owner maps are cached per lowered shape object, so a downstream feature
// inherits from a seeded (cached) predecessor without recomputing it, and the
// cache dies with the shape at the next evaluation.

import type { FeatureId } from '../../shared/intent/types';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { HistoryMap } from '../../kernel/naming/evolutionRecord';
import { faceHashOf } from '../../kernel/backends/occt/createdRefs';

/** Face hash → owning feature id, for every face of one lowered shape. */
type FaceOwnerMap = Map<string, FeatureId>;

interface ShapeOwners {
  byHash: FaceOwnerMap;
  /** Owner per face index. */
  byIndex: readonly FeatureId[];
}

const ownersByShape = new WeakMap<object, ShapeOwners>();

export interface FeatureOwnership {
  /** Owner per face index (= `FaceGeometry.faceId`). Omitted when every face
   *  belongs to the feature itself. */
  faceOwners?: string[];
  /** Owner per edge, in `edgeHashes` order. Omitted when every face (and so
   *  every edge) belongs to the feature itself. */
  edgeOwners?: string[];
}

export interface FeatureOwnershipInput {
  featureId: FeatureId;
  /** The lowered shape of this feature (carries the `historyMap`). */
  shape: ShapeBackend;
  /** The raw replicad shape `meshShape` walked. */
  rawShape: unknown;
  /** Lowered shapes of the direct predecessors, where available. */
  predecessorShapes: readonly ShapeBackend[];
  /** Edge hashes in `edgeRanges` order, from `meshShape`. */
  edgeHashes?: readonly number[];
  /** Record id → capture index, used to pick the newest owner of an edge. */
  recordOrder: ReadonlyMap<FeatureId, number>;
  /** The feature copies its single predecessor with topology preserved
   *  (e.g. `assemblyPart`): inherit owners by face order. */
  topologyCopy?: boolean;
}

interface ReplicadEdgeLike { hashCode: number }
interface ReplicadFaceLike { edges?: Iterable<ReplicadEdgeLike> }

function facesOf(rawShape: unknown): unknown[] {
  const faces = (rawShape as { faces?: unknown } | null)?.faces;
  if (Array.isArray(faces)) return faces;
  if (faces && typeof (faces as { length?: unknown }).length === 'number') {
    return Array.from(faces as ArrayLike<unknown>);
  }
  return [];
}

function safeFaceHash(face: unknown): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return faceHashOf(face as any);
  } catch {
    return undefined;
  }
}

/** Owner of one face by rules 1–4 (see file header). */
function ownerOfFace(
  hash: string | undefined,
  featureId: FeatureId,
  historyMap: HistoryMap | undefined,
  inherited: readonly FaceOwnerMap[],
): FeatureId {
  if (hash === undefined) return featureId;
  const lineage = historyMap?.get(hash);
  if (lineage?.featureId) return lineage.featureId;
  for (const map of inherited) {
    const owner = map.get(hash);
    if (owner !== undefined) return owner;
  }
  if (lineage?.rootFeatureId) return lineage.rootFeatureId;
  return featureId;
}

/** Newest (by record order) owner of the faces bounding each edge. */
function edgeOwnersOf(
  faces: readonly unknown[],
  faceOwners: readonly string[],
  edgeHashes: readonly number[],
  recordOrder: ReadonlyMap<FeatureId, number>,
  featureId: FeatureId,
): string[] {
  const rank = (id: string): number => recordOrder.get(id) ?? -1;
  const ownerByEdge = new Map<number, string>();
  faces.forEach((face, i) => {
    const owner = faceOwners[i] ?? featureId;
    let edges: Iterable<ReplicadEdgeLike> | undefined;
    try {
      edges = (face as ReplicadFaceLike).edges;
    } catch {
      return;
    }
    if (!edges) return;
    for (const edge of edges) {
      const hash = edge.hashCode;
      const prev = ownerByEdge.get(hash);
      if (prev === undefined || rank(owner) > rank(prev)) ownerByEdge.set(hash, owner);
    }
  });
  return edgeHashes.map((h) => ownerByEdge.get(h) ?? featureId);
}

/**
 * Attribute every face and edge of one meshed feature to the feature that
 * created it. Also records the face owner map on the shape so features built
 * on it inherit the attribution.
 */
export function computeFeatureOwnership(input: FeatureOwnershipInput): FeatureOwnership {
  const { featureId, shape, rawShape, predecessorShapes, edgeHashes, recordOrder } = input;
  const historyMap = (shape as { historyMap?: HistoryMap }).historyMap;
  const predecessorOwners = predecessorShapes
    .map((p) => ownersByShape.get(p))
    .filter((o): o is ShapeOwners => o !== undefined);
  const inherited = predecessorOwners.map((o) => o.byHash);

  const faces = facesOf(rawShape);
  const copiedFrom = input.topologyCopy && predecessorOwners.length === 1
    && predecessorOwners[0]!.byIndex.length === faces.length
    ? predecessorOwners[0]!.byIndex
    : undefined;
  const byHash: FaceOwnerMap = new Map();
  const faceOwners: string[] = [];
  let uniform = true;
  faces.forEach((face, i) => {
    const hash = safeFaceHash(face);
    const owner = copiedFrom?.[i] ?? ownerOfFace(hash, featureId, historyMap, inherited);
    if (hash !== undefined) byHash.set(hash, owner);
    faceOwners[i] = owner;
    if (owner !== featureId) uniform = false;
  });
  ownersByShape.set(shape, { byHash, byIndex: faceOwners });

  if (uniform) return {};
  const out: FeatureOwnership = { faceOwners };
  if (edgeHashes !== undefined && edgeHashes.length > 0) {
    out.edgeOwners = edgeOwnersOf(faces, faceOwners, edgeHashes, recordOrder, featureId);
  }
  return out;
}
