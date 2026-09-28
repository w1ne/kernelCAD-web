// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Binds a Monaco editor to the selection ↔ code link.
 *
 *   geometry → code: when the viewer publishes a `link`, decorate the source
 *     range of the feature that made the picked face/edge and scroll it into
 *     view. The cursor is never moved.
 *   code → geometry: a user cursor move (click / arrow keys) or a mouse hover
 *     over a statement publishes the feature ids under it; the viewer tints
 *     their faces. Blur and mouse-leave clear it.
 *
 * Loop guard: only cursor changes with `reason === Explicit` from the mouse
 * or keyboard count. Programmatic moves (`source: 'api'`), typing, paste and
 * undo are not user navigation. Typing clears the highlight instead of
 * re-parsing, so nothing runs on the keystroke path. Hover and cursor updates
 * are throttled.
 *
 * Framework-free and typed against the small editor surface it uses, so it is
 * testable without Monaco.
 */
import {
    featuresAtPosition,
    type FeatureSourceIndex,
    type SourceRange,
} from './featureSourceIndex';
import type { CodeLink, SelectionCodeStore } from './selectionCodeStore';

interface Disposable { dispose(): void }

interface Position { lineNumber: number; column: number }

/** Monaco `CursorChangeReason.Explicit`: a click or an arrow/navigation key. */
export const CURSOR_REASON_EXPLICIT = 3;

export interface CursorEventLike {
    position: Position;
    source: string;
    reason: number;
}

export interface MouseEventLike {
    target: { position: Position | null };
}

interface DecorationLike { range: SourceRange; options: Record<string, unknown> }

/** The Monaco editor members this controller uses; all optional so a partial
 *  editor (tests, older builds) degrades to a no-op. */
export interface SyncEditorLike {
    deltaDecorations?(oldIds: string[], next: DecorationLike[]): string[];
    revealRangeInCenterIfOutsideViewport?(range: SourceRange): void;
    revealLineInCenter?(lineNumber: number): void;
    hasTextFocus?(): boolean;
    onDidChangeCursorPosition?(cb: (e: CursorEventLike) => void): Disposable;
    onMouseMove?(cb: (e: MouseEventLike) => void): Disposable;
    onMouseLeave?(cb: () => void): Disposable;
    onDidBlurEditorText?(cb: () => void): Disposable;
}

export interface CodeGeometrySyncOptions {
    /** Current index (cached per evaluation + source by the caller). */
    getIndex(): FeatureSourceIndex | null;
    store: SelectionCodeStore;
    /** Throttle window for hover / cursor updates, ms. */
    throttleMs?: number;
}

export interface CodeGeometrySync {
    /** Re-apply the current link (call after a re-evaluation or source change). */
    refresh(): void;
    dispose(): void;
}

const USER_SOURCES = new Set(['mouse', 'keyboard']);
const LINK_CLASS = 'kc-code-link';

export function attachCodeGeometrySync(
    editor: SyncEditorLike,
    options: CodeGeometrySyncOptions,
): CodeGeometrySync {
    const { getIndex, store } = options;
    const throttleMs = options.throttleMs ?? 50;
    const disposables: Disposable[] = [];
    let decorationIds: string[] = [];
    let cursorPos: Position | null = null;
    let hoverPos: Position | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastLinkSeq = -1;
    let disposed = false;

    const publish = (): void => {
        timer = null;
        if (disposed) return;
        const focused = editor.hasTextFocus?.() ?? true;
        const pos = hoverPos ?? (focused ? cursorPos : null);
        const index = pos ? getIndex() : null;
        const ids = pos && index ? featuresAtPosition(index, pos.lineNumber, pos.column) : null;
        store.highlightFromCode(ids);
    };

    const schedule = (): void => {
        if (timer === null) timer = setTimeout(publish, throttleMs);
    };

    const setDecoration = (range: SourceRange | null): void => {
        if (!editor.deltaDecorations) return;
        decorationIds = editor.deltaDecorations(
            decorationIds,
            range ? [{ range, options: { className: LINK_CLASS, stickiness: 1 } }] : [],
        );
    };

    const applyLink = (link: CodeLink | null, force: boolean): void => {
        if (!link || !link.featureId) {
            lastLinkSeq = link?.seq ?? -1;
            setDecoration(null);
            return;
        }
        const entry = getIndex()?.byFeatureId.get(link.featureId);
        if (!entry) {
            setDecoration(null);
            return;
        }
        const range = entry.callRange ?? entry.statementRange;
        setDecoration(range);
        // Scroll only on a new click, not when a re-evaluation re-applies it.
        if (force || link.seq !== lastLinkSeq) {
            if (editor.revealRangeInCenterIfOutsideViewport) editor.revealRangeInCenterIfOutsideViewport(range);
            else editor.revealLineInCenter?.(entry.line);
        }
        lastLinkSeq = link.seq;
    };

    const onCursor = editor.onDidChangeCursorPosition?.((e) => {
        if (!USER_SOURCES.has(e.source)) return;
        if (e.reason !== CURSOR_REASON_EXPLICIT) {
            // Typing / paste / undo: the source no longer matches the last
            // evaluation. Drop the highlight; do not parse on keystrokes.
            cursorPos = null;
            if (hoverPos === null) store.highlightFromCode(null);
            return;
        }
        cursorPos = { lineNumber: e.position.lineNumber, column: e.position.column };
        schedule();
    });
    if (onCursor) disposables.push(onCursor);

    const onMove = editor.onMouseMove?.((e) => {
        const p = e.target.position;
        hoverPos = p ? { lineNumber: p.lineNumber, column: p.column } : null;
        schedule();
    });
    if (onMove) disposables.push(onMove);

    const onLeave = editor.onMouseLeave?.(() => {
        hoverPos = null;
        schedule();
    });
    if (onLeave) disposables.push(onLeave);

    const onBlur = editor.onDidBlurEditorText?.(() => {
        cursorPos = null;
        schedule();
    });
    if (onBlur) disposables.push(onBlur);

    // The store also emits for code-highlight changes; only a new link object
    // needs a decoration update.
    let appliedLink = store.getSnapshot().link;
    disposables.push({
        dispose: store.subscribe(() => {
            const link = store.getSnapshot().link;
            if (link === appliedLink) return;
            appliedLink = link;
            applyLink(link, false);
        }),
    });
    applyLink(appliedLink, true);

    return {
        refresh: () => applyLink(store.getSnapshot().link, false),
        dispose: () => {
            disposed = true;
            if (timer !== null) clearTimeout(timer);
            for (const d of disposables) d.dispose();
            setDecoration(null);
            store.highlightFromCode(null);
        },
    };
}
