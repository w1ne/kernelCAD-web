// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The rules for the Studio's first-run surfaces, kept apart from the
// components: where the empty state and the coach marks may show, when a
// viewport counts as empty, and the once-per-browser coach-mark flag.

/** Routes that show someone else's model, or a model inside another page. */
const VIEW_ONLY_PATH = /^\/(p|embed|g)\//;

/** Query keys that load a supplied model: the viewport must keep it. */
const SOURCE_KEYS = ['script', 'gallery', 'headless'] as const;

export interface FirstRunContext {
    /** `useStudioChrome().viewerMode`: a read-only review page. */
    readonly viewerMode: boolean;
    /** `useStudioConfig().showHeader`: false in an embed host. */
    readonly showHeader: boolean;
    readonly pathname: string;
    readonly search: string;
}

/** True only in the editable Studio: not on /p/, /embed/ or /g/ pages, not
 *  in an embed host, and not when a link supplies the model. */
export function firstRunAllowed(ctx: FirstRunContext): boolean {
    if (ctx.viewerMode || !ctx.showHeader) return false;
    if (VIEW_ONLY_PATH.test(ctx.pathname)) return false;
    const query = new URLSearchParams(ctx.search);
    return !SOURCE_KEYS.some((key) => query.has(key));
}

export interface ViewportContent {
    readonly isReady: boolean;
    readonly isComputing: boolean;
    readonly error: string | null | undefined;
    /** Completed runs of the current source; 0 before the first result. */
    readonly executionCount: number;
    readonly geometryCount: number;
    readonly sketchCount: number;
    readonly previewCount: number;
    readonly sketching: boolean;
}

/** The model ran, without an error, and gave nothing to show. A run in
 *  progress, an error, a sketch or a preview is never "empty". */
export function isViewportEmpty(v: ViewportContent): boolean {
    return v.isReady
        && !v.isComputing
        && !v.error
        && v.executionCount > 0
        && v.geometryCount === 0
        && v.sketchCount === 0
        && v.previewCount === 0
        && !v.sketching;
}

export const COACH_MARKS_KEY = 'kernelcad.studio.coachMarks';

/** True when this browser has not seen the coach marks. Blocked storage
 *  reads as "seen": without the flag the tour would show on every visit. */
export function coachMarksPending(storage: Pick<Storage, 'getItem'> | undefined = safeLocalStorage()): boolean {
    try {
        return !!storage && storage.getItem(COACH_MARKS_KEY) === null;
    } catch {
        return false;
    }
}

/** Record that this browser has seen the coach marks. */
export function markCoachMarksSeen(storage: Pick<Storage, 'setItem'> | undefined = safeLocalStorage()): void {
    try {
        storage?.setItem(COACH_MARKS_KEY, 'done');
    } catch {
        /* storage blocked: the tour may show again next visit */
    }
}

function safeLocalStorage(): Storage | undefined {
    try {
        return typeof localStorage === 'undefined' ? undefined : localStorage;
    } catch {
        return undefined;
    }
}

/** Automated browsers (test runners, render capture) get no tour: it would
 *  sit over the controls they click and the frames they capture. */
export function isAutomatedBrowser(nav: Pick<Navigator, 'webdriver'> | undefined =
    typeof navigator === 'undefined' ? undefined : navigator): boolean {
    return nav?.webdriver === true;
}
