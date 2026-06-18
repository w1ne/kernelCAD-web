// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export const SHORTCUT_HINTS = {
    sketch: 'S',
    extrude: 'E',
    revolve: 'R',
    fillet: 'F',
    chamfer: 'C',
    union: 'J',
    cut: 'X',
    intersect: 'I',
    offsetPlane: 'P',
    undo: 'Ctrl/Cmd+Z',
    redo: 'Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y',
} as const;

export const FEATURE_SHORTCUTS: Record<string, string | undefined> = {
    extrude: SHORTCUT_HINTS.extrude,
    extrudeFromFace: SHORTCUT_HINTS.extrude,
    revolve: SHORTCUT_HINTS.revolve,
    fillet: SHORTCUT_HINTS.fillet,
    chamfer: SHORTCUT_HINTS.chamfer,
    union: SHORTCUT_HINTS.union,
    cut: SHORTCUT_HINTS.cut,
    intersect: SHORTCUT_HINTS.intersect,
    offsetPlane: SHORTCUT_HINTS.offsetPlane,
};

export function formatTooltip(label: string, shortcutHint?: string, description?: string): string {
    const firstLine = shortcutHint ? `${label} (${shortcutHint})` : label;
    return description ? `${firstLine}\n${description}` : firstLine;
}

