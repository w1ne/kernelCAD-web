// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** What a key press in an open menu does. */
export type MenuKeyResult =
    | { readonly kind: 'focus'; readonly index: number }
    | { readonly kind: 'select' }
    | { readonly kind: 'close' }
    | null;

/**
 * Menu keyboard model. `enabled` holds the indexes of the items that can take
 * focus, in order; `current` is the focused index.
 */
export function menuKey(key: string, enabled: readonly number[], current: number): MenuKeyResult {
    if (enabled.length === 0) return key === 'Escape' || key === 'Tab' ? { kind: 'close' } : null;
    const at = enabled.indexOf(current);
    switch (key) {
        case 'ArrowDown':
            return { kind: 'focus', index: enabled[(at + 1) % enabled.length] };
        case 'ArrowUp':
            return { kind: 'focus', index: enabled[(at - 1 + enabled.length) % enabled.length] };
        case 'Home':
            return { kind: 'focus', index: enabled[0] };
        case 'End':
            return { kind: 'focus', index: enabled[enabled.length - 1] };
        case 'Enter':
        case ' ':
            return { kind: 'select' };
        case 'Escape':
        case 'Tab':
            return { kind: 'close' };
        default:
            return null;
    }
}

const EDGE = 8;
const GAP = 4;

/** Menu position: under the trigger, above when it does not fit, kept on screen. */
export function placeMenu(
    anchor: { top: number; bottom: number; left: number; right: number },
    menu: { width: number; height: number },
    align: 'start' | 'end',
    viewport: { width: number; height: number },
): { top: number; left: number } {
    let top = anchor.bottom + GAP;
    if (top + menu.height > viewport.height - EDGE && anchor.top - GAP - menu.height > EDGE) {
        top = anchor.top - GAP - menu.height;
    }
    const left = align === 'end' ? anchor.right - menu.width : anchor.left;
    return { top, left: Math.max(EDGE, Math.min(left, viewport.width - menu.width - EDGE)) };
}
