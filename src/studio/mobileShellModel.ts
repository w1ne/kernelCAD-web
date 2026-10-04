// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The phone Studio's logic, kept apart from its components: which tabs the
// bottom bar shows, which sheet each tab opens, and the status line that
// replaces the desktop status bar.
import type { ViewMode3D } from '../shared/types/viewMode';
import type { TabId } from './types';

/** The bottom tab bar. "Model" closes every sheet; the model fills the screen. */
export type MobileTabId = 'model' | 'agent' | 'params' | 'code' | 'more';

/**
 * A sheet over the bottom of the model. `code` and `params` are tabs; the
 * rest open from "More" and show a way back to it.
 */
export type MobileSheetId =
    | 'agent'
    | 'code'
    | 'params'
    | 'more'
    | 'tree'
    | 'projects'
    | 'validity'
    | 'joints'
    | 'animation'
    | 'export'
    | 'status';

export const MOBILE_TAB_LABEL: Readonly<Record<MobileTabId, string>> = {
    model: 'Model',
    agent: 'Agent',
    params: 'Params',
    code: 'Code',
    more: 'More',
};

export const MOBILE_SHEET_TITLE: Readonly<Record<MobileSheetId, string>> = {
    agent: 'Agent',
    code: 'Code',
    params: 'Params',
    more: 'More',
    tree: 'Model tree',
    projects: 'Projects',
    validity: 'Checks',
    joints: 'Joints',
    animation: 'Animation',
    export: 'Export',
    status: 'Status',
};

/** The tabs in bar order. No Agent where the host or the route has none. */
export function mobileTabs(showAgent: boolean): readonly MobileTabId[] {
    return showAgent ? ['model', 'agent', 'params', 'code', 'more'] : ['model', 'params', 'code', 'more'];
}

/** The tab that is current while a sheet is open (null: the model). */
export function tabForSheet(sheet: MobileSheetId | null): MobileTabId {
    if (sheet === null) return 'model';
    if (sheet === 'agent' || sheet === 'code' || sheet === 'params') return sheet;
    return 'more';
}

/** The sheet a tab opens (null: close the sheet and show the model). */
export function sheetForTab(tab: MobileTabId): MobileSheetId | null {
    return tab === 'model' ? null : tab;
}

/** Sheets that stand in for an inspector tab. They keep `inspectorOpen` in step. */
const INSPECTOR_SHEETS: ReadonlySet<MobileSheetId> = new Set<MobileSheetId>([
    'code', 'params', 'validity', 'joints', 'animation', 'export',
]);

export function isInspectorSheet(sheet: MobileSheetId | null): boolean {
    return sheet !== null && INSPECTOR_SHEETS.has(sheet);
}

/** The sheet for an inspector tab request (palette "Show … tab"). */
export function sheetForInspectorTab(tab: TabId): MobileSheetId | null {
    if (tab === 'scene') return 'tree';
    return INSPECTOR_SHEETS.has(tab as MobileSheetId) ? (tab as MobileSheetId) : null;
}

/** Sheets that open from "More" get a back button to it. */
export function opensFromMore(sheet: MobileSheetId): boolean {
    return tabForSheet(sheet) === 'more' && sheet !== 'more';
}

/** Next tab for a key on the tab bar (manual activation), or null for other keys. */
export function tabForKey(key: string, index: number, count: number): number | null {
    switch (key) {
        case 'ArrowRight':
            return (index + 1) % count;
        case 'ArrowLeft':
            return (index - 1 + count) % count;
        case 'Home':
            return 0;
        case 'End':
            return count - 1;
        default:
            return null;
    }
}

export interface MobileStatusInput {
    readonly isComputing: boolean;
    readonly error: string | null;
    readonly geometryCount: number;
    readonly selectedCount: number;
    readonly interferences: number;
    readonly recomputeMs?: number;
    readonly viewMode3D: ViewMode3D;
}

export type MobileStatusTone = 'ok' | 'busy' | 'danger';

export interface MobileStatusRow {
    readonly label: string;
    readonly value: string;
}

export interface MobileStatus {
    readonly tone: MobileStatusTone;
    /** "Ready", "Computing…" or "Error". */
    readonly state: string;
    /** The first line of the error, when there is one. */
    readonly detail: string | null;
    readonly rows: readonly MobileStatusRow[];
}

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

function viewModeLabel(mode: ViewMode3D): string {
    if (mode === 'shadedWithEdges') return 'Shaded + edges';
    if (mode === 'wireframe') return 'Wireframe';
    return 'Shaded';
}

/**
 * The desktop status bar as rows for the phone's Status sheet. The bar does
 * not fit a phone's width, so its facts stack here instead.
 */
export function mobileStatus(input: MobileStatusInput, version: string): MobileStatus {
    const tone: MobileStatusTone = input.error ? 'danger' : input.isComputing ? 'busy' : 'ok';
    const state = input.error ? 'Error' : input.isComputing ? 'Computing…' : 'Ready';
    const detail = input.error ? (input.error.split('\n')[0]?.trim() || 'Unknown error') : null;
    const rows: MobileStatusRow[] = [
        { label: 'Bodies', value: plural(input.geometryCount, 'body', 'bodies') },
        { label: 'Selection', value: `${input.selectedCount} selected` },
        { label: 'Interferences', value: String(input.interferences) },
    ];
    if (typeof input.recomputeMs === 'number' && input.recomputeMs > 0) {
        rows.push({ label: 'Last compute', value: `${input.recomputeMs} ms` });
    }
    rows.push({ label: 'View', value: viewModeLabel(input.viewMode3D) }, { label: 'Version', value: version });
    return { tone, state, detail, rows };
}
