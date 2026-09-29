// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Inspector width in px: 340 by default, resizable from 280 to 560. */
export const INSPECTOR_WIDTH = { min: 280, max: 560, default: 340, step: 16 } as const;

const STORAGE_KEY = 'kernelcad:inspectorWidth';

export function clampInspectorWidth(width: number): number {
    if (!Number.isFinite(width)) return INSPECTOR_WIDTH.default;
    return Math.round(Math.min(INSPECTOR_WIDTH.max, Math.max(INSPECTOR_WIDTH.min, width)));
}

/**
 * The next width for a key press on the resize handle, or `null` when the
 * key does nothing. The inspector sits on the right, so ArrowLeft widens it.
 */
export function inspectorWidthForKey(width: number, key: string): number | null {
    switch (key) {
        case 'ArrowLeft':
            return clampInspectorWidth(width + INSPECTOR_WIDTH.step);
        case 'ArrowRight':
            return clampInspectorWidth(width - INSPECTOR_WIDTH.step);
        case 'Home':
            return INSPECTOR_WIDTH.min;
        case 'End':
            return INSPECTOR_WIDTH.max;
        default:
            return null;
    }
}

/** Stored width, or the default. Storage can be missing or throw (private mode). */
export function readStoredInspectorWidth(): number {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw == null) return INSPECTOR_WIDTH.default;
        return clampInspectorWidth(Number(raw));
    } catch {
        return INSPECTOR_WIDTH.default;
    }
}

export function writeStoredInspectorWidth(width: number): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(clampInspectorWidth(width)));
    } catch {
        // A per-viewer convenience only; ignore storage failures.
    }
}
