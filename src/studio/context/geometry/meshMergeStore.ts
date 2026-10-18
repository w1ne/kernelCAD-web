// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/context/geometry/meshMergeStore.ts
//
// Per-source store for the client-side merge of partial bin1 mesh payloads.
// Last merged geometry per studio source. Seeded by every full payload
// (initial load, code edit, Validate) and folded by partial param-edit
// responses; `paramEditsForMesh.meshParamEdits` reads the held fingerprints to
// send as `have` and merges its responses back in here. Keyed by source, so a
// code edit naturally starts a fresh entry (same keys compare by content
// fingerprint, so a param edit with different overrides still diffs correctly
// against the claimed geometry). `mergeFeatureMeshes` below stays pure — this
// module owns where the state lives.

import type { FeatureMeshSerializedInput } from '../../../modeling/capture/featureMeshBinary';
import type { BackendMeshPayload } from '../../scriptSource';
import { mergeFeatureMeshes, orderedFeatures, type MeshMergeState } from './mergeFeatureMeshes';

const meshMergeStates = new Map<string, MeshMergeState>();

/** The merge state for `source`, or null when nothing has been received. */
export function meshMergeStateFor(source: string): MeshMergeState | null {
    return meshMergeStates.get(source) ?? null;
}

/** Fold a mesh response into the stored state for `source` and return the
 *  payload with its `features` replaced by the merged, display-ordered set.
 *  Serves both the dev and hosted paths. `trailer === undefined` (initial
 *  load, code edit, unedited source) is a full replace and resets the store
 *  to that one source: every other key is stale by definition (the current
 *  source is the only one the studio meshes), so this is what keeps a
 *  session's worth of edited code from pinning a full mesh copy per revision.
 *  `baseState` defaults to the stored state; `meshParamEdits` passes the
 *  snapshot whose fingerprints it sent as `have`. Throws on a trailer naming
 *  an unchanged id the state does not hold — the caller must refetch full. */
export function mergeMeshPayload(
    source: string,
    payload: BackendMeshPayload,
    baseState: MeshMergeState | null = meshMergeStateFor(source),
): BackendMeshPayload {
    const { state } = mergeFeatureMeshes(
        baseState,
        payload.features as FeatureMeshSerializedInput[],
        payload.trailer,
    );
    if (payload.trailer === undefined) meshMergeStates.clear();
    meshMergeStates.set(source, state);
    return { ...payload, features: orderedFeatures(state) };
}

/** Test-only: drop every stored state so cases cannot leak into each other. */
export function __resetMeshMergeStatesForTests(): void {
    meshMergeStates.clear();
}
