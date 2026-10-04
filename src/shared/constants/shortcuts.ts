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


/**
 * The Studio keymap: one entry per bound shortcut, as the keys `Kbd` prints
 * ('Mod' is Cmd on Apple, Ctrl elsewhere). The bindings, the palette's
 * inline hints and the shortcuts list all read this table.
 */
export const KEYMAP = {
    commandPalette: ['Mod', 'K'],
    toggleInspector: ['Mod', '\\'],
    run: ['Mod', 'Enter'],
    undo: ['Mod', 'Z'],
    redo: ['Mod', 'Shift', 'Z'],
    redoAlt: ['Mod', 'Y'],
    close: ['Escape'],
} as const satisfies Record<string, readonly string[]>;

export type KeymapId = keyof typeof KEYMAP;

/** One row of the keyboard shortcuts list. */
export interface ShortcutHelpEntry {
    readonly label: string;
    /** Alternative key sequences for the same action. */
    readonly keys: ReadonlyArray<readonly string[]>;
}

export const SHORTCUT_HELP: readonly ShortcutHelpEntry[] = [
    { label: 'Open the command palette', keys: [KEYMAP.commandPalette] },
    { label: 'Show or hide the inspector', keys: [KEYMAP.toggleInspector] },
    { label: 'Run the model', keys: [KEYMAP.run] },
    { label: 'Undo', keys: [KEYMAP.undo] },
    { label: 'Redo', keys: [KEYMAP.redo, KEYMAP.redoAlt] },
    { label: 'Close a dialog, the palette or marking mode', keys: [KEYMAP.close] },
];

const MODIFIER_ORDER = ['Mod', 'Shift', 'Alt'] as const;

/**
 * The combo string `useKeyboardShortcuts` matches for a key sequence:
 * modifiers in its fixed order (mod, shift, alt), then the key, lower case.
 * `['Mod', 'Shift', 'Z']` → `'mod+shift+z'`.
 */
export function shortcutCombo(keys: readonly string[]): string {
    const mods = MODIFIER_ORDER.filter((m) => keys.includes(m)).map((m) => m.toLowerCase());
    const rest = keys.filter((k) => !(MODIFIER_ORDER as readonly string[]).includes(k)).map((k) => k.toLowerCase());
    return [...mods, ...rest].join('+');
}
