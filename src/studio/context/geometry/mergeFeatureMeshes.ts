// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/context/geometry/mergeFeatureMeshes.ts
//
// Client-side merge of partial bin1 mesh payloads. A param-edit response may
// carry only the changed features plus a trailer naming the unchanged/removed
// rest (`MeshBinaryTrailer`); this module keeps the already-received geometry
// as a per-feature map and folds each patch into it so the live Studio state
// survives a partial response. Pure and browser-safe — the caller owns where
// the state lives (the per-source store in `meshMergeStore`).

import type { FeatureMeshSerializedInput, MeshBinaryTrailer } from '../../../modeling/capture/featureMeshBinary';

export interface MeshMergeState {
    /** featureIds in display order. */
    order: string[];
    /** Last received payload per feature (reused by identity when unchanged). */
    meshes: Map<string, FeatureMeshSerializedInput>;
    /** Content fingerprint per feature. A feature missing here carries no
     *  fingerprint ("unknown") — the client must not claim to hold it. */
    fingerprints: Map<string, string>;
}

/** Start of the error thrown by `partialMerge` on a trailer that names an
 *  unchanged id the state does not hold. Exported so `paramEditsForMesh` can
 *  recognise the mismatch without duplicating the message. */
export const MESH_MERGE_UNKNOWN_ID_PREFIX = 'mesh merge: unknown unchanged id ';

export function emptyMergeState(): MeshMergeState {
    return { order: [], meshes: new Map(), fingerprints: new Map() };
}

/** The merged features in display order, ready for the existing geometry
 *  conversion (`featureMeshesToGeometries`). */
export function orderedFeatures(state: MeshMergeState): FeatureMeshSerializedInput[] {
    return state.order
        .map((id) => state.meshes.get(id))
        .filter((mesh): mesh is FeatureMeshSerializedInput => mesh !== undefined);
}

/** `trailer === undefined` — initial load, code edit, or an unedited source:
 *  the payload is the whole model. */
function fullReplace(incoming: FeatureMeshSerializedInput[]): MeshMergeState {
    const next = emptyMergeState();
    for (const feature of incoming) {
        next.order.push(feature.featureId);
        next.meshes.set(feature.featureId, feature);
        if (feature.fingerprint !== undefined) next.fingerprints.set(feature.featureId, feature.fingerprint);
    }
    return next;
}

/** Apply a patch: replace/insert every incoming feature (inserts append in
 *  incoming order), drop `removedIds`, keep everything else — unchanged
 *  features keep their exact objects, so the viewport does not re-upload
 *  geometry the client already holds.
 *
 *  Every `unchangedIds` entry must be held: the trailer is computed against
 *  the fingerprints the client sent as `have`, so an id the state does not
 *  know means client and server disagree about what was sent. Throw so the
 *  caller can refetch full rather than paint an incomplete scene. */
function partialMerge(
    base: MeshMergeState,
    incoming: FeatureMeshSerializedInput[],
    trailer: MeshBinaryTrailer,
): MeshMergeState {
    for (const id of trailer.unchangedIds) {
        if (!base.meshes.has(id)) throw new Error(`${MESH_MERGE_UNKNOWN_ID_PREFIX}${id}`);
    }
    const removed = new Set(trailer.removedIds);
    const next = emptyMergeState();
    for (const id of base.order) {
        if (removed.has(id)) continue;
        next.order.push(id);
        const mesh = base.meshes.get(id);
        if (mesh !== undefined) next.meshes.set(id, mesh);
        const fingerprint = base.fingerprints.get(id);
        if (fingerprint !== undefined) next.fingerprints.set(id, fingerprint);
    }
    for (const feature of incoming) {
        const id = feature.featureId;
        if (!next.meshes.has(id)) next.order.push(id);
        next.meshes.set(id, feature);
        if (feature.fingerprint !== undefined) next.fingerprints.set(id, feature.fingerprint);
        else next.fingerprints.delete(id);
    }
    return next;
}

function sameOrder(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index]);
}

function sameFingerprints(left: ReadonlyMap<string, string>, right: ReadonlyMap<string, string>): boolean {
    if (left.size !== right.size) return false;
    for (const [id, fingerprint] of left) {
        if (right.get(id) !== fingerprint) return false;
    }
    return true;
}

export function mergeFeatureMeshes(
    state: MeshMergeState | null,
    incoming: FeatureMeshSerializedInput[],
    trailer?: MeshBinaryTrailer,
): { state: MeshMergeState; changed: boolean } {
    const base = state ?? emptyMergeState();
    const next = trailer === undefined ? fullReplace(incoming) : partialMerge(base, incoming, trailer);
    // A feature without a fingerprint cannot be compared, so it always counts
    // as changed — and `partialMerge` stored it as absent for the same reason.
    const changed = incoming.some((feature) => feature.fingerprint === undefined)
        || !sameOrder(base.order, next.order)
        || !sameFingerprints(base.fingerprints, next.fingerprints);
    return { state: next, changed };
}
