// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

const isApple =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

const GLYPH: Record<string, string> = {
    Mod: isApple ? '⌘' : 'Ctrl',
    Alt: isApple ? '⌥' : 'Alt',
    Shift: '⇧',
    Enter: '↵',
    Escape: 'Esc',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
};

/** The printed form of one key. */
export function keyLabel(key: string): string {
    return GLYPH[key] ?? key;
}
