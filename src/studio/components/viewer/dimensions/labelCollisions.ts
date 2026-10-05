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

/** Ids of the labels to show: greedy in priority order, a label is dropped
 *  when it overlaps one already kept. Returned in priority order. */
export function visibleLabels(labels: readonly PlacedLabel[]): string[] {
    const ordered = [...labels].sort((p, q) => p.priority - q.priority);
    const kept: PlacedLabel[] = [];
    for (const label of ordered) {
        if (!kept.some((k) => overlaps(k.box, label.box))) kept.push(label);
    }
    return kept.map((k) => k.id);
}
