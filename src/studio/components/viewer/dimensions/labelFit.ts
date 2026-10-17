// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Dimension labels on a small canvas: shorter text, a smaller pill, and a
// position clamped inside the canvas. The label pass (collisions) and the
// drawn label use the same rules, so what is hidden is what would overlap.

import { PHONE_QUERY } from '../../../hooks/useIsNarrow';

/** Longest compact label, in characters, before the name is cut. */
const COMPACT_MAX_CHARS = 22;
/** Gap kept between a clamped label and the canvas edge (CSS px). */
export const LABEL_EDGE_PX = 4;

let phoneQuery: MediaQueryList | null | undefined;

/** Phones get the compact labels; a desktop canvas keeps the full text. */
export function compactLabels(): boolean {
    if (phoneQuery === undefined) {
        phoneQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_QUERY) : null;
    }
    return phoneQuery?.matches ?? false;
}

/** Tests: forget the cached media query (a stubbed matchMedia changed). */
export function resetCompactLabelsForTest(): void {
    phoneQuery = undefined;
}

/**
 * The label for a small canvas: notes in brackets go ("reachable width
 * (pencil tip, collision-free) 140" -> "reachable width 140"), and a name
 * that is still long is cut with an ellipsis, keeping the trailing value.
 */
export function compactDimensionLabel(label: string): string {
    const plain = label.replace(/\s*\([^()]*\)/g, '').replace(/\s+/g, ' ').trim() || label.trim();
    if (plain.length <= COMPACT_MAX_CHARS) return plain;
    const match = /^(.*?)\s+(\S*\d\S*)$/.exec(plain);
    if (!match) return `${plain.slice(0, COMPACT_MAX_CHARS - 1).trimEnd()}…`;
    const [, name, value] = match;
    const room = Math.max(4, COMPACT_MAX_CHARS - value.length - 2);
    return name.length <= room ? plain : `${name.slice(0, room).trimEnd()}… ${value}`;
}

/** Approximate pill size in CSS px (the collision pass cannot measure DOM). */
export function labelBoxSize(label: string, sublabel: string | undefined, compact: boolean): { w: number; h: number } {
    const text = compact ? compactDimensionLabel(label) : label;
    const sub = sublabel;
    const charPx = compact ? 6.5 : 8;
    const padPx = compact ? 12 : 18;
    const lineH = compact ? 20 : 26;
    return {
        w: Math.max(text.length, sub?.length ?? 0) * charPx + padPx,
        h: lineH + (sub ? (compact ? 12 : 14) : 0),
    };
}

/** Moves a label centred at (x, y) with size w x h so it stays inside the
 *  canvas. A label wider than the canvas is centred on it. A label whose
 *  anchor is far off the canvas (zoomed past it, more than a quarter of the
 *  canvas out) is left where it is, so off-screen dimensions do not pile up
 *  along the edge. */
export function clampLabelCentre(
    x: number, y: number, w: number, h: number, width: number, height: number, edge = LABEL_EDGE_PX,
): [number, number] {
    const outX = width / 4;
    const outY = height / 4;
    if (!(width > 0 && height > 0) || x < -outX || x > width + outX || y < -outY || y > height + outY) return [x, y];
    const clampAxis = (v: number, size: number, extent: number) => {
        const min = size / 2 + edge;
        const max = extent - size / 2 - edge;
        return min > max ? extent / 2 : Math.min(Math.max(v, min), max);
    };
    return [clampAxis(x, w, width), clampAxis(y, h, height)];
}
