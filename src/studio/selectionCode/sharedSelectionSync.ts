// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { selectionResultSchema, type SharedSelection } from '../../shared/selection/sharedSelection';
import type { SelectionCodeStore } from './selectionCodeStore';

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

/** One request at a time; a click during a read wins over that read. */
export function attachSharedSelection(
    store: SelectionCodeStore,
    request: (method: 'GET' | 'POST', selection?: SharedSelection, modelGeneration?: number) => Promise<unknown>,
    applyFace: (selection: { shapeIndex: number; faceId: number } | null) => void,
) {
    let disposed = false;
    let applying = false;
    let pending = false;
    let generation = 0;
    let busy = false;
    let modelGeneration: number | undefined;
    let lastLink = store.getSnapshot().link;
    const unsubscribe = store.subscribe(() => {
        const link = store.getSnapshot().link;
        if (link === lastLink) return;
        lastLink = link;
        if (!applying) { pending = true; generation += 1; }
    });
    return {
        async tick(): Promise<void> {
            if (disposed || busy) return;
            busy = true;
            const started = generation;
            const writing = pending && modelGeneration !== undefined;
            const link = store.getSnapshot().link;
            const selection = link ? { ...link.pick, featureId: link.featureId } : null;
            try {
                const result = selectionResultSchema.parse(await request(writing ? 'POST' : 'GET', selection, modelGeneration));
                if (disposed) return;
                const rebuilt = modelGeneration !== undefined && modelGeneration !== result.modelGeneration;
                modelGeneration = result.modelGeneration;
                if (rebuilt) {
                    pending = false;
                } else {
                    if (!result.ok || generation !== started || (pending && !writing)) return;
                    if (writing) pending = false;
                }
                applying = true;
                applySelectionToViewer(store, result.selection, applyFace);
            } catch {
                // Leave failed writes pending for retry; disconnected Studio does not erase a click.
            } finally {
                applying = false;
                busy = false;
            }
        },
        dispose() { disposed = true; unsubscribe(); },
    };
}
