// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { selectionResultSchema, type FaceSignature, type SharedSelection } from '../../shared/selection/sharedSelection';
import type { SelectionCodeStore } from './selectionCodeStore';
import type { GeometryResult } from '../../shared/worker/workerTypes';
import { remapFaceSignature, signatureForSelection } from './faceSignature';

function applySelectionToViewer(
    store: SelectionCodeStore,
    next: SharedSelection,
    applyFace: (selection: { shapeIndex: number; faceId: number } | null) => void,
): void {
    const current = store.getSnapshot().link;
    const currentSelection = current ? { ...current.pick, featureId: current.featureId } : null;
    if (JSON.stringify(currentSelection) === JSON.stringify(next)) return;
    if (next) {
        store.linkFromGeometry({ shapeIndex: next.shapeIndex, kind: next.kind, id: next.id }, next.featureId, null);
    } else store.clearLink();
    applyFace(next?.kind === 'face' ? { shapeIndex: next.shapeIndex, faceId: next.id } : null);
}

type SelectionRequest = (method: 'GET' | 'POST', selection?: SharedSelection, modelGeneration?: number, faceSignature?: FaceSignature | null) => Promise<unknown>;
interface BridgeRuntime {
    store: SelectionCodeStore;
    request: SelectionRequest;
    applyFace: (selection: { shapeIndex: number; faceId: number } | null) => void;
    geometries: () => readonly GeometryResult[];
    meshRevision: () => number | null;
    disposed: boolean;
    applying: boolean;
    pending: boolean;
    generation: number;
    busy: boolean;
    modelGeneration?: number;
    pendingRemap: { signature: FaceSignature; generation: number; meshRevision: number | null } | null;
    pendingGeometry: readonly GeometryResult[] | null;
}

function captureLocalSelection(runtime: BridgeRuntime): SharedSelection {
    const link = runtime.store.getSnapshot().link;
    return link ? { ...link.pick, featureId: link.featureId } : null;
}

function applyPendingSignature(result: ReturnType<typeof selectionResultSchema.parse>, runtime: BridgeRuntime): boolean {
    if (!result.pendingSignature || runtime.pendingRemap?.generation === result.modelGeneration) return false;
    runtime.pendingRemap = { signature: result.pendingSignature, generation: result.modelGeneration, meshRevision: runtime.meshRevision() };
    runtime.pendingGeometry = runtime.geometries();
    runtime.applying = true;
    runtime.store.clearLink();
    runtime.applyFace(null);
    return true;
}

async function commitPendingRemap(
    result: ReturnType<typeof selectionResultSchema.parse>, runtime: BridgeRuntime, started: number,
): Promise<boolean> {
    const pending = runtime.pendingRemap;
    if (!pending || result.modelGeneration !== pending.generation) return false;
    const currentMeshRevision = runtime.meshRevision();
    const geometry = runtime.geometries();
    const refreshed = pending.meshRevision !== null
        ? currentMeshRevision !== null && currentMeshRevision !== pending.meshRevision
        : currentMeshRevision !== null || geometry !== runtime.pendingGeometry;
    if (!refreshed) return true;
    const remapped = remapFaceSignature(geometry, pending.signature);
    const signature = remapped ? signatureForSelection(geometry, remapped) : null;
    const committed = selectionResultSchema.parse(await runtime.request('POST', remapped, result.modelGeneration, signature));
    if (!committed.ok || committed.modelGeneration !== result.modelGeneration) return true;
    runtime.modelGeneration = committed.modelGeneration;
    if (runtime.generation !== started) { runtime.pending = true; return true; }
    runtime.pendingRemap = null;
    runtime.pendingGeometry = null;
    runtime.applying = true;
    applySelectionToViewer(runtime.store, committed.selection, runtime.applyFace);
    return true;
}

function applyOrdinaryResult(
    result: ReturnType<typeof selectionResultSchema.parse>, runtime: BridgeRuntime,
    started: number, writing: boolean,
): void {
    const rebuilt = runtime.modelGeneration !== undefined && runtime.modelGeneration !== result.modelGeneration;
    runtime.modelGeneration = result.modelGeneration;
    if (rebuilt && writing) {
        runtime.pending = false;
        runtime.applying = true;
        runtime.store.clearLink();
        runtime.applyFace(null);
        return;
    }
    if (rebuilt) runtime.pending = false;
    else if (!result.ok || runtime.generation !== started || (runtime.pending && !writing)) return;
    else if (writing) runtime.pending = false;
    runtime.applying = true;
    if (!runtime.pendingRemap) applySelectionToViewer(runtime.store, result.selection, runtime.applyFace);
}

/** One request at a time; a click during a read wins over that read. */
export function attachSharedSelection(
    store: SelectionCodeStore,
    request: SelectionRequest,
    applyFace: (selection: { shapeIndex: number; faceId: number } | null) => void,
    geometries: () => readonly GeometryResult[] = () => [],
    meshRevision: () => number | null = () => null,
) {
    const runtime: BridgeRuntime = { store, request, applyFace, geometries, meshRevision, disposed: false, applying: false,
        pending: false, generation: 0, busy: false, pendingRemap: null, pendingGeometry: null };
    let lastLink = store.getSnapshot().link;
    const unsubscribe = store.subscribe(() => {
        const link = store.getSnapshot().link;
        if (link === lastLink) return;
        lastLink = link;
        if (!runtime.applying) { runtime.pending = true; runtime.generation += 1; }
    });
    return {
        async tick(): Promise<void> {
            if (runtime.disposed || runtime.busy) return;
            runtime.busy = true;
            const started = runtime.generation;
            const writing = runtime.pending && runtime.modelGeneration !== undefined;
            const selection = captureLocalSelection(runtime);
            try {
                const result = selectionResultSchema.parse(await runtime.request(writing ? 'POST' : 'GET', selection, runtime.modelGeneration,
                    writing ? signatureForSelection(geometries(), selection) : null));
                if (runtime.disposed) return;
                if (applyPendingSignature(result, runtime)) return;
                if (!writing && await commitPendingRemap(result, runtime, started)) return;
                applyOrdinaryResult(result, runtime, started, writing);
            } catch {
                // Leave failed writes pending for retry; disconnected Studio does not erase a click.
            } finally {
                runtime.applying = false;
                runtime.busy = false;
            }
        },
        dispose() { runtime.disposed = true; unsubscribe(); },
    };
}
