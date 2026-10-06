// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Screen-space rectangle in CSS pixels. */
export interface LabelBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface PlacedLabel {
    id: string;
    /** Lower is more important (declared first, then the auto priority order). */
    priority: number;
    box: LabelBox;
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** True when label `i`'s box overlaps a label before it that `kept` marks shown. */
export function overlapsKept(labels: readonly PlacedLabel[], kept: readonly boolean[], i: number): boolean {
    for (let j = 0; j < i; j++) {
        if (kept[j] && overlaps(labels[j].box, labels[i].box)) return true;
    }
    return false;
}

/** In-place greedy pass for the per-frame path. `labels` must already be in
 *  priority order (as `placeDimensions` emits them). `out[i]` becomes true
 *  when label i is `active` and overlaps no earlier kept label. Allocates
 *  nothing. */
export function markVisible(labels: readonly PlacedLabel[], active: readonly boolean[], out: boolean[]): void {
    for (let i = 0; i < labels.length; i++) out[i] = active[i] && !overlapsKept(labels, out, i);
}

/** Ids of the labels to show: greedy in priority order, a label is dropped
 *  when it overlaps one already kept. Returned in priority order. */
export function visibleLabels(labels: readonly PlacedLabel[]): string[] {
    const ordered = [...labels].sort((p, q) => p.priority - q.priority);
    const kept: boolean[] = new Array(ordered.length).fill(false);
    markVisible(ordered, ordered.map(() => true), kept);
    return ordered.filter((_, i) => kept[i]).map((l) => l.id);
}
