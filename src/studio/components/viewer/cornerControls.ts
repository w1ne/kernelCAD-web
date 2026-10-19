// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CSSProperties } from 'react';

/** CSS variable a floating toolbar sets on the viewport's container: how far
 *  the controls pinned to the viewer's top-left corner (Measure, Dimensions)
 *  must drop to clear it. Unset (0) where nothing floats over that corner. */
export const CORNER_INSET_VAR = '--kc-corner-inset';

/** `top` for a top-left corner control: 0.75 rem below whatever covers the corner. */
export const CORNER_TOP: CSSProperties = { top: `calc(var(${CORNER_INSET_VAR}, 0px) + 0.75rem)` };

/** `top` for the line of text under the corner controls. */
export const CORNER_BELOW_TOP: CSSProperties = { top: `calc(var(${CORNER_INSET_VAR}, 0px) + 3.5rem)` };

/** The tool dock's slot. Viewer tools portal into it when the dock is mounted. */
export const TOOL_DOCK_SLOT_ID = 'studio-toolbar-tools';

let toolDock: HTMLElement | null = null;
const toolDockListeners = new Set<() => void>();

/** The toolbar registers its slot; the viewer subscribes and portals into it. */
export function registerToolDock(node: HTMLElement | null): void {
    toolDock = node;
    for (const listener of toolDockListeners) listener();
}

export function subscribeToolDock(listener: () => void): () => void {
    toolDockListeners.add(listener);
    return () => { toolDockListeners.delete(listener); };
}

export function currentToolDock(): HTMLElement | null {
    return toolDock;
}
