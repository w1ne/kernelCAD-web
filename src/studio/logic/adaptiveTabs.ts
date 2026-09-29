// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { StudioRecomputeResult, TabId } from '../types';
import { selectAnimationMetadata } from './animationRecord';

/**
 * Inspector tab order. Code and Checks are always there; the rest show only
 * when the model has something for them. Reserved views (`sections`, `cut`,
 * `render`) are never shown: a tab strip is not a feature list.
 *
 * Scene is last. It stays in the inspector until the model tree has its own
 * pane, and at the default width it sits in the "More" menu.
 */
export const INSPECTOR_TAB_ORDER: readonly TabId[] = [
    'code',
    'params',
    'validity',
    'joints',
    'animation',
    'export',
    'scene',
];

/** The tab id stays `validity` (test ids and stored state use it); users see "Checks". */
export const INSPECTOR_TAB_LABEL: Readonly<Partial<Record<TabId, string>>> = {
    code: 'Code',
    params: 'Params',
    validity: 'Checks',
    joints: 'Joints',
    animation: 'Animation',
    export: 'Export',
    scene: 'Scene',
};

/** Links the inspector `Tabs` to its `TabPanel`s. */
export const INSPECTOR_TABS_ID = 'inspector';

/** The tab the inspector opens on, and falls back to when a tab goes away. */
export const DEFAULT_INSPECTOR_TAB: TabId = 'code';

/**
 * Which inspector tabs the latest recompute gives content to, in display order.
 *
 * - `code`, `validity` (Checks), `scene` — always: the script, the checks
 *   (an honest "not run yet" state included) and the model tree.
 * - `params` — the script declared at least one `param(...)`.
 * - `joints` — the assembly declared at least one mate with pose.
 * - `animation` — the script declared an `animationView(...)` (last-wins).
 * - `export` — there's at least one geometry to export.
 */
export function getVisibleTabs(result: StudioRecomputeResult | null): readonly TabId[] {
    const has: Partial<Record<TabId, boolean>> = {
        code: true,
        validity: true,
        scene: true,
    };
    if (result != null) {
        has.params = result.paramTable != null && result.paramTable.size() > 0;
        has.joints = (result.joints ?? []).length > 0;
        has.animation = selectAnimationMetadata(result.features) != null;
        has.export = result.geometries.length > 0;
    }
    return INSPECTOR_TAB_ORDER.filter((id) => has[id] === true);
}

/** Approximate rendered widths of the tab strip, in px (12 px Inter, px-3 tabs). */
const TAB_CHAR_PX = 6.8;
const TAB_PAD_PX = 28; // 24 px padding + 4 px gap
const TAB_COUNT_PX = 26; // the count pill after the label
const MORE_PX = 64;
const STRIP_PAD_PX = 16;

/**
 * How many tabs fit in a strip `width` px wide, keeping one slot for "More"
 * when they do not all fit. Returns `undefined` when every tab fits (no menu).
 */
export function fitTabCount(
    tabs: ReadonlyArray<{ readonly label: string; readonly count?: number }>,
    width: number,
): number | undefined {
    const widths = tabs.map((t) => t.label.length * TAB_CHAR_PX + TAB_PAD_PX + (t.count != null ? TAB_COUNT_PX : 0));
    const room = width - STRIP_PAD_PX;
    if (widths.reduce((sum, w) => sum + w, 0) <= room) return undefined;
    let used = MORE_PX;
    let fits = 0;
    for (const w of widths) {
        if (used + w > room) break;
        used += w;
        fits += 1;
    }
    // `Tabs.maxVisible` counts the "More" slot too.
    return Math.max(1, fits) + 1;
}
