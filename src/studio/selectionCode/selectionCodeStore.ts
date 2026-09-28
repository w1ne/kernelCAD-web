// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * State for the two-way link between the 3D view and the code.
 *
 * Two independent channels, one per direction, so neither can drive the
 * other (no feedback loop):
 *   - `link` (geometry → code): written only by a viewer click; the Code tab
 *     reads it and decorates the source range. Decorating never moves the
 *     editor cursor, so it cannot produce a code → geometry event.
 *   - `codeHighlight` (code → geometry): written only by the Code tab from a
 *     user cursor move or hover; the viewer reads it and tints faces. It
 *     never writes `link`.
 * A viewer click clears `codeHighlight` so the click result is not mixed
 * with an older code highlight.
 *
 * `preselect` is the hovered face/edge. It changes on pointer move, so it is
 * stored without notifying subscribers; the click handler reads it once.
 */
import { useSyncExternalStore } from 'react';
import type { GeometryPick } from './geometryLineage';

export interface CodeLink {
    readonly pick: GeometryPick;
    /** Feature that created the picked face/edge; null when unknown. */
    readonly featureId: string | null;
    /** Click position in viewer-container pixels, for the label. */
    readonly anchor: { readonly x: number; readonly y: number } | null;
    /** Bumps on every click so a repeat click on the same face re-reveals. */
    readonly seq: number;
}

export interface SelectionCodeState {
    readonly link: CodeLink | null;
    /** Feature ids the code cursor / hover points at; null when none. */
    readonly codeHighlight: readonly string[] | null;
}

type Listener = () => void;

function sameIds(a: readonly string[] | null, b: readonly string[] | null): boolean {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    return a.every((id, i) => id === b[i]);
}

export class SelectionCodeStore {
    private state: SelectionCodeState = { link: null, codeHighlight: null };
    private preselect: GeometryPick | null = null;
    private seq = 0;
    private readonly listeners = new Set<Listener>();

    getSnapshot = (): SelectionCodeState => this.state;

    subscribe = (listener: Listener): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    /** Hovered face/edge. Silent: read by the click handler only. */
    setPreselect(pick: GeometryPick | null): void {
        this.preselect = pick;
    }

    getPreselect(): GeometryPick | null {
        return this.preselect;
    }

    /** Geometry → code. Clears any code-driven highlight. */
    linkFromGeometry(pick: GeometryPick, featureId: string | null, anchor: CodeLink['anchor']): void {
        this.seq += 1;
        this.state = { link: { pick, featureId, anchor, seq: this.seq }, codeHighlight: null };
        this.emit();
    }

    clearLink(): void {
        if (this.state.link === null) return;
        this.state = { ...this.state, link: null };
        this.emit();
    }

    /** Code → geometry. Never touches `link`. Empty/null clears. */
    highlightFromCode(featureIds: readonly string[] | null): void {
        const next = featureIds && featureIds.length > 0 ? [...featureIds] : null;
        if (sameIds(this.state.codeHighlight, next)) return;
        this.state = { ...this.state, codeHighlight: next };
        this.emit();
    }

    /** Test helper: back to the initial state. */
    reset(): void {
        this.state = { link: null, codeHighlight: null };
        this.preselect = null;
        this.emit();
    }

    private emit(): void {
        for (const listener of this.listeners) listener();
    }
}

export const selectionCodeStore = new SelectionCodeStore();

export function useSelectionCodeState(): SelectionCodeState {
    return useSyncExternalStore(
        selectionCodeStore.subscribe,
        selectionCodeStore.getSnapshot,
        selectionCodeStore.getSnapshot,
    );
}
