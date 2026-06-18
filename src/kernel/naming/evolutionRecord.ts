// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Per-shape history machinery. Each OcctBackend carries a `HistoryMap` that
 * tracks every face's lineage back to its originating primitive and canonical name.
 *
 * Resolution (in `resolveFaceRef.ts`) walks the input chain back to a primitive,
 * resolves the canonical name there, then walks forward through every operation's
 * history-derived map to the current handle.
 *
 * v0.2 scope: identity preservation for unambiguous cases. Ambiguous splits and
 * deleted faces are reported via diagnostics; geometry-fallback is v0.3.
 */

export type FaceHash = string;
export type EdgeHash = string;

export type CanonicalFaceName = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export interface FaceLineage {
  /** Hash of the corresponding face on the originating primitive. */
  rootHash: FaceHash;
  /** Canonical name on the originating primitive, if any. */
  canonicalName?: CanonicalFaceName;
  /** Sketch label, if the face came from a labeled sketch segment (extrude/revolve/etc). */
  labelName?: string;
  /** Originating primitive feature ID. */
  rootFeatureId: string;
  // --- slice-2 additions (additive; existing entries unaffected) ---
  /** Geometric fingerprint captured at face creation. The geometry-snapshot
   *  resolver matches against this when topology lookup returns zero hits. */
  snapshot?: import('../backends/occt/createdRefs').FaceSnapshot;
  /** ID of the feature whose lowerer created or labelled this face. Distinct
   *  from `rootFeatureId` (which always points to the originating primitive). */
  featureId?: string;
  /** Agent-chosen feature name (`hole(face, { ..., name: 'mountingBolt' })`).
   *  Enables `<name>.<ref>` selector resolution. */
  featureName?: string;
  /** 1-based ordinal among unnamed features of the same kind in the chain.
   *  Enables `<kind><N>.<ref>` (e.g., `hole1.wall`) selector resolution. */
  featureOrdinal?: number;
  /** Feature kind that emitted this label. Needed for ordinal resolution. */
  featureKind?: import('../../shared/intent/types').FeatureKind;
  /** Geometric fingerprint captured ONCE at face creation. Immutable.
   *  `refreshSnapshots` must not overwrite this. The geometry-snapshot
   *  fallback resolver compares against this when the topology route
   *  loses the face. */
  snapshotAtCreate?: import('../backends/occt/createdRefs').FaceSnapshot;
  /** OCCT surface type read at create time (`face.geomType`). Used as the
   *  4th discriminator in the geometry-snapshot fallback. */
  surfaceType?: 'PLANE' | 'CYLINDRE' | 'CONE' | 'SPHERE' | 'TORUS' | 'BSPLINE' | 'OTHER';
}

export interface EdgeLineage {
  /** Hash of the corresponding edge on the originating primitive. */
  rootHash: EdgeHash;
  /** Originating primitive feature ID. */
  rootFeatureId: string;
  /** If the edge comes from a labeled sketch segment. */
  labelName?: string;
  // --- Slice Q (Query DSL) parity additions; mirror FaceLineage slots ---
  /** ID of the feature whose lowerer created or labelled this edge. Distinct
   *  from `rootFeatureId` (which always points to the originating primitive).
   *  Used by `kc.q.edge(kc.q.createdBy('<featureId>'))` resolution. */
  featureId?: string;
  /** Agent-chosen feature name (e.g. `arm` when `.id('arm')` was pinned on the
   *  emitting op). Enables `kc.q.edge(kc.q.withFeatureName('arm'))`. */
  featureName?: string;
  /** Feature kind that emitted this edge. Mirrors `FaceLineage.featureKind`;
   *  enables `kc.q.edge(kc.q.geometryType('LINE'))` when combined with
   *  surface-type heuristics. */
  featureKind?: import('../../shared/intent/types').FeatureKind;
}

export type HistoryMap = Map<FaceHash, FaceLineage>;
export type EdgeHistoryMap = Map<EdgeHash, EdgeLineage>;

/**
 * Part-level lineage carried by an assembly's part registry.
 *
 * Mirrors `FaceLineage` / `EdgeLineage` for the part scope so part-level
 * Queries (`kc.q.part(kc.q.withFeatureName('arm'))`) resolve through the
 * same lineage pathway as face- and edge-level Queries. Distinct from
 * `FeatureRecord` because lineage carries the agent-facing slots (the
 * user-supplied `name`, the originating feature-kind) without dragging
 * in the FeatureRecord's `inputs`/`params`/`transforms` machinery.
 *
 * Every `.part(name, shape, opts?)` capture-site writes one entry to
 * `Assembly.__partLineage()`'s map. The lineage's `featureId` is the
 * same id the capture-session minted for the `assemblyPart`
 * FeatureRecord — anchors the lineage to the existing FeatureRecord
 * graph rather than introducing a parallel id stream.
 */
export interface PartLineage {
  /** ID of the capture-session record for this part — stable across the
   *  in-memory session. Distinct from `featureName` (which is the user-
   *  supplied label). Used by `kc.q.part(kc.q.createdBy('<featureId>'))`. */
  featureId: string;
  /** User-supplied name on `.part(name, shape, opts?)`. Used by
   *  `kc.q.part(kc.q.withFeatureName('<name>'))`. */
  featureName: string;
  /** Feature kind that emitted this part — always `'assemblyPart'` in v1;
   *  reserved for future part-creation primitives. Matches the
   *  `FeatureKind` union value used by `session.assemblyPart(...)`. */
  featureKind: import('../../shared/intent/types').FeatureKind;
}

/** Per-assembly part-lineage registry, keyed by user-supplied part name. */
export type PartLineageMap = Map<string /* part-name */, PartLineage>;

/** Optional snapshot-aware transform callbacks for `propagateTransformHistory`.
 *  When supplied, the lineage is deep-copied and the snapshot's centroid +
 *  normal are run through the supplied functions. When omitted, lineage is
 *  shared by reference (slice-1 behavior preserved).
 *
 *  - `pointTransform`: applies the transform's matrix to a 3D point (centroid).
 *  - `vectorTransform`: applies the transform's matrix to a 3D vector (normal).
 *    For rigid transforms, this is identical to the rotation portion.
 *  - `clearSnapshot`: when true, the propagator drops the snapshot field
 *    entirely (used for non-rigid transforms — det != 1 — where area would
 *    no longer match). Mutually exclusive with the transform fns. */
export interface SnapshotTransform {
  pointTransform?: (p: readonly [number, number, number]) => [number, number, number];
  vectorTransform?: (v: readonly [number, number, number]) => [number, number, number];
  clearSnapshot?: boolean;
}

/**
 * Map an input HistoryMap through a topology-preserving transform (translate,
 * rotate, scale, reflect, mirror).
 *
 * Both `inputHashes` and `outputHashes` are produced by enumerating faces in
 * `TopExp_Explorer` order on the input and output shapes respectively. OCCT
 * preserves topology order across rigid-body and affine transforms, so the
 * i-th input face corresponds to the i-th output face.
 *
 * Length mismatch indicates the operation was not topology-preserving — throw
 * (caller bug; transforms should never split or merge faces).
 *
 * `snapshotTransform` (optional, slice-2): when provided, transforms each
 * lineage's `snapshot` field via the supplied callbacks. When omitted, lineage
 * is shared by reference; the snapshot stays attached to its pre-transform
 * coordinates and may match worse against post-transform geometry — that is
 * the correct conservative failure mode (the topology path takes precedence).
 */
export function propagateTransformHistory(
  inputMap: HistoryMap,
  inputHashes: readonly FaceHash[],
  outputHashes: readonly FaceHash[],
  snapshotTransform?: SnapshotTransform,
): HistoryMap {
  if (inputHashes.length !== outputHashes.length) {
    throw new Error(
      `propagateTransformHistory: face count mismatch (input ${inputHashes.length} vs output ${outputHashes.length}). Transforms must preserve topology.`,
    );
  }
  const out: HistoryMap = new Map();
  for (let i = 0; i < inputHashes.length; i++) {
    const inputLineage = inputMap.get(inputHashes[i]);
    if (!inputLineage) continue;
    if (!snapshotTransform || !inputLineage.snapshot) {
      // Slice-1 path: share lineage by reference. Lineage is treated as
      // immutable by convention.
      out.set(outputHashes[i], inputLineage);
      continue;
    }
    // Slice-2 path: deep-copy lineage to avoid mutating shared reference,
    // then transform the snapshot.
    const cloned = { ...inputLineage };
    if (snapshotTransform.clearSnapshot) {
      delete cloned.snapshot;
    } else if (inputLineage.snapshot) {
      const c = inputLineage.snapshot.centroid;
      const n = inputLineage.snapshot.normal;
      cloned.snapshot = {
        centroid: snapshotTransform.pointTransform
          ? snapshotTransform.pointTransform(c)
          : [c[0], c[1], c[2]],
        normal: snapshotTransform.vectorTransform
          ? snapshotTransform.vectorTransform(n)
          : [n[0], n[1], n[2]],
        area: inputLineage.snapshot.area,
      };
    }
    out.set(outputHashes[i], cloned);
  }
  return out;
}

/**
 * Slice Q (Query DSL) — edge-level analogue of `propagateTransformHistory`.
 *
 * Two paths share the helper:
 *
 *  - **Pure transform** (default): `outputFeatureId === undefined`. Input
 *    lineage entries are shared by reference, matching the face-level slice-1
 *    convention. Used by translate / rotate / mirror / scale propagators that
 *    do not introduce new feature provenance.
 *
 *  - **Feature emission** (Q1): the caller passes `outputFeatureId` (and
 *    optionally `outputFeatureKind` / `outputFeatureName`). Each output edge
 *    receives a cloned lineage entry with the feature-id stamped on, so that
 *    `kc.q.edge(kc.q.createdBy('<featureId>'))` resolves through the same
 *    pathway `FaceLineage.featureId` already drives for face-level queries.
 *    The clone preserves `rootHash`, `rootFeatureId`, and `labelName`; the
 *    feature stamp layers on top.
 *
 * Length mismatch indicates the operation was not topology-preserving — throw
 * (caller bug; transforms should never split or merge edges). Missing input
 * lineage entries are tolerated (the corresponding output edge is omitted),
 * mirroring `propagateTransformHistory`'s sparse-map behaviour.
 */
export function propagateEdgeTransformHistory(
  inputMap: EdgeHistoryMap,
  inputHashes: readonly EdgeHash[],
  outputHashes: readonly EdgeHash[],
  outputFeatureId?: string,
  outputFeatureKind?: import('../../shared/intent/types').FeatureKind,
  outputFeatureName?: string,
): EdgeHistoryMap {
  if (inputHashes.length !== outputHashes.length) {
    throw new Error(
      `propagateEdgeTransformHistory: edge count mismatch (input ${inputHashes.length} vs output ${outputHashes.length}). Transforms must preserve topology.`,
    );
  }
  const out: EdgeHistoryMap = new Map();
  for (let i = 0; i < inputHashes.length; i++) {
    const inputLineage = inputMap.get(inputHashes[i]);
    if (!inputLineage) continue;
    if (outputFeatureId === undefined) {
      // Pure-transform path: share lineage by reference. Lineage is treated
      // as immutable by convention.
      out.set(outputHashes[i], inputLineage);
      continue;
    }
    // Feature-emission path: clone so the input lineage stays unchanged for
    // any other map that still references it, then stamp the feature slots.
    const cloned: EdgeLineage = {
      ...inputLineage,
      featureId: outputFeatureId,
      ...(outputFeatureKind !== undefined ? { featureKind: outputFeatureKind } : {}),
      ...(outputFeatureName !== undefined ? { featureName: outputFeatureName } : {}),
    };
    out.set(outputHashes[i], cloned);
  }
  return out;
}
