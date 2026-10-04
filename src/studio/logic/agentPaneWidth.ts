// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Agent pane width in px: 360 by default, resizable from 280 to 560. */
export const AGENT_PANE_WIDTH = { min: 280, max: 560, default: 360, step: 16 } as const;

const STORAGE_KEY = 'kernelcad:agentPaneWidth';

export function clampAgentPaneWidth(width: number): number {
    if (!Number.isFinite(width)) return AGENT_PANE_WIDTH.default;
    return Math.round(Math.min(AGENT_PANE_WIDTH.max, Math.max(AGENT_PANE_WIDTH.min, width)));
}

/**
 * The next width for a key press on the resize handle, or `null` when the
 * key does nothing. The pane sits on the left, so ArrowRight widens it.
 */
export function agentPaneWidthForKey(width: number, key: string): number | null {
    switch (key) {
        case 'ArrowRight':
            return clampAgentPaneWidth(width + AGENT_PANE_WIDTH.step);
        case 'ArrowLeft':
            return clampAgentPaneWidth(width - AGENT_PANE_WIDTH.step);
        case 'Home':
            return AGENT_PANE_WIDTH.min;
        case 'End':
            return AGENT_PANE_WIDTH.max;
        default:
            return null;
    }
}

/** Stored width, or the default. Storage can be missing or throw (private mode). */
export function readStoredAgentPaneWidth(): number {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw == null) return AGENT_PANE_WIDTH.default;
        return clampAgentPaneWidth(Number(raw));
    } catch {
        return AGENT_PANE_WIDTH.default;
    }
}

export function writeStoredAgentPaneWidth(width: number): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(clampAgentPaneWidth(width)));
    } catch {
        // A per-viewer convenience only; ignore storage failures.
    }
}
