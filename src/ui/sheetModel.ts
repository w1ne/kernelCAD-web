// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Bottom-sheet snap points as fractions of the viewport height. */
export const DEFAULT_SNAPS: readonly number[] = [0.25, 0.55, 0.9];

/** The snap index nearest to a height fraction. */
export function nearestSnap(fraction: number, snaps: readonly number[]): number {
    let best = 0;
    for (let i = 1; i < snaps.length; i++) {
        if (Math.abs(snaps[i] - fraction) < Math.abs(snaps[best] - fraction)) best = i;
    }
    return best;
}

/** Next snap index for a key on the grab handle, or null for other keys. */
export function snapForKey(key: string, index: number, count: number): number | null {
    switch (key) {
        case 'ArrowUp':
        case 'PageUp':
            return Math.min(count - 1, index + 1);
        case 'ArrowDown':
        case 'PageDown':
            return Math.max(0, index - 1);
        case 'Home':
            return 0;
        case 'End':
            return count - 1;
        default:
            return null;
    }
}
