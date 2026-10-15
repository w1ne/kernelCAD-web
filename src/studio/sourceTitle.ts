// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Title of the document a `?gallery=` route opened. The gallery source owns
// the workbench code on that route, not the locally stored active project, so
// the Header must name the example rather than that project ("Untitled
// Project").
import { useSyncExternalStore } from 'react';

let current: string | null = null;
const listeners = new Set<() => void>();

export function setSourceTitle(title: string | null): void {
    const next = title?.trim() || null;
    if (next === current) return;
    current = next;
    for (const listener of listeners) listener();
}

export function getSourceTitle(): string | null {
    return current;
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** The open source route's title, or null when the active project owns the code. */
export function useSourceTitle(): string | null {
    return useSyncExternalStore(subscribe, getSourceTitle, () => null);
}
