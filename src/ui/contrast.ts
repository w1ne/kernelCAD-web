// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * WCAG 2.x contrast helpers. Used by the token contrast test and by the
 * component gallery to print the ratio next to each colour pair.
 */

/** Parse `#RGB` or `#RRGGBB` into 0–255 channels. */
export function parseHex(hex: string): [number, number, number] {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) throw new Error(`not a hex colour: ${hex}`);
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance of a hex colour. */
export function relativeLuminance(hex: string): number {
    const [r, g, b] = parseHex(hex).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(a: string, b: string): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** AA minimums: 4.5 for body text, 3 for large text (≥ 18 px) and UI outlines. */
export const AA_TEXT = 4.5;
export const AA_LARGE_OR_UI = 3;
