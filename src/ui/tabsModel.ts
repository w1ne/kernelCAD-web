// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export interface TabItem {
    readonly id: string;
    readonly label: string;
    /** false hides the tab. Tabs are never shown disabled. */
    readonly available?: boolean;
    /** Optional count after the label ("Checks 2"). */
    readonly count?: number;
}

export function tabId(tabsId: string, id: string): string {
    return `${tabsId}-tab-${id}`;
}

export function panelId(tabsId: string, id: string): string {
    return `${tabsId}-panel-${id}`;
}

/**
 * Split the available tabs into the shown row and the overflow. The selected
 * tab is always in the row: it takes the last slot when it would overflow.
 */
export function splitTabs(
    items: readonly TabItem[],
    value: string,
    maxVisible: number | undefined,
): { shown: TabItem[]; overflow: TabItem[] } {
    const available = items.filter((t) => t.available !== false);
    if (!maxVisible || available.length <= maxVisible) return { shown: available, overflow: [] };
    const slots = Math.max(1, maxVisible - 1); // one slot for "More"
    const shown = available.slice(0, slots);
    const selected = available.find((t) => t.id === value);
    if (selected && !shown.includes(selected)) shown[shown.length - 1] = selected;
    return { shown, overflow: available.filter((t) => !shown.includes(t)) };
}
