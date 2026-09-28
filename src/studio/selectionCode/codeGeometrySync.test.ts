// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import {
    attachCodeGeometrySync,
    CURSOR_REASON_EXPLICIT,
    type CursorEventLike,
    type MouseEventLike,
    type SyncEditorLike,
} from './codeGeometrySync';
import { buildFeatureSourceIndex, type SourceRange } from './featureSourceIndex';
import { SelectionCodeStore } from './selectionCodeStore';

const CODE = [
    'const body = box(40, 30, 10);',
    'const rounded = body.fillet(2, { parallel: [0, 0, 1] });',
    'return rounded;',
].join('\n');

function rec(id: string, kind: string, line: number, column: number): FeatureRecord {
    return {
        id, kind: kind as FeatureRecord['kind'], inputs: {}, params: {}, transforms: [],
        suppressed: false, scriptLocation: { file: 'm.kcad.ts', line, column },
    };
}
const FEATURES = [rec('box_1', 'box', 1, 14), rec('fillet_1', 'fillet', 2, 22)];

/** A Monaco stand-in that records calls and lets the test fire events. As in
 *  Monaco, setting decorations or revealing does NOT fire cursor events;
 *  `setPosition` does, with `source: 'api'`. */
class FakeEditor implements SyncEditorLike {
    decorations: { range: SourceRange; options: Record<string, unknown> }[] = [];
    revealed: SourceRange[] = [];
    setPositionCalls = 0;
    focused = true;
    private cursorCbs: ((e: CursorEventLike) => void)[] = [];
    private moveCbs: ((e: MouseEventLike) => void)[] = [];
    private leaveCbs: (() => void)[] = [];
    private blurCbs: (() => void)[] = [];

    deltaDecorations(_old: string[], next: { range: SourceRange; options: Record<string, unknown> }[]): string[] {
        this.decorations = next;
        return next.map((_, i) => `d${i}`);
    }
    revealRangeInCenterIfOutsideViewport(range: SourceRange): void { this.revealed.push(range); }
    hasTextFocus(): boolean { return this.focused; }
    setPosition(p: { lineNumber: number; column: number }): void {
        this.setPositionCalls += 1;
        this.fireCursor(p.lineNumber, p.column, 'api', CURSOR_REASON_EXPLICIT);
    }
    onDidChangeCursorPosition(cb: (e: CursorEventLike) => void) { this.cursorCbs.push(cb); return { dispose: () => {} }; }
    onMouseMove(cb: (e: MouseEventLike) => void) { this.moveCbs.push(cb); return { dispose: () => {} }; }
    onMouseLeave(cb: () => void) { this.leaveCbs.push(cb); return { dispose: () => {} }; }
    onDidBlurEditorText(cb: () => void) { this.blurCbs.push(cb); return { dispose: () => {} }; }

    fireCursor(lineNumber: number, column: number, source: string, reason: number): void {
        for (const cb of this.cursorCbs) cb({ position: { lineNumber, column }, source, reason });
    }
    fireMove(lineNumber: number | null, column = 1): void {
        for (const cb of this.moveCbs) cb({ target: { position: lineNumber === null ? null : { lineNumber, column } } });
    }
    fireLeave(): void { for (const cb of this.leaveCbs) cb(); }
    fireBlur(): void { this.focused = false; for (const cb of this.blurCbs) cb(); }
}

describe('attachCodeGeometrySync', () => {
    let store: SelectionCodeStore;
    let editor: FakeEditor;
    const index = buildFeatureSourceIndex(CODE, FEATURES);

    beforeEach(() => {
        vi.useFakeTimers();
        store = new SelectionCodeStore();
        editor = new FakeEditor();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    const attach = () => attachCodeGeometrySync(editor, { store, getIndex: () => index, throttleMs: 10 });

    it('code cursor → highlighted feature set (throttled)', () => {
        attach();
        editor.fireCursor(2, 25, 'mouse', CURSOR_REASON_EXPLICIT);
        expect(store.getSnapshot().codeHighlight).toBeNull();
        vi.advanceTimersByTime(10);
        expect(store.getSnapshot().codeHighlight).toEqual(['fillet_1']);
        editor.fireCursor(1, 15, 'keyboard', CURSOR_REASON_EXPLICIT);
        vi.advanceTimersByTime(10);
        expect(store.getSnapshot().codeHighlight).toEqual(['box_1']);
    });

    it('hover wins over the cursor; leave falls back; blur clears', () => {
        attach();
        editor.fireCursor(1, 15, 'mouse', CURSOR_REASON_EXPLICIT);
        editor.fireMove(2, 25);
        vi.advanceTimersByTime(10);
        expect(store.getSnapshot().codeHighlight).toEqual(['fillet_1']);
        editor.fireLeave();
        vi.advanceTimersByTime(10);
        expect(store.getSnapshot().codeHighlight).toEqual(['box_1']);
        editor.fireBlur();
        vi.advanceTimersByTime(10);
        expect(store.getSnapshot().codeHighlight).toBeNull();
    });

    it('typing clears the highlight without resolving the source', () => {
        const getIndex = vi.fn(() => index);
        attachCodeGeometrySync(editor, { store, getIndex, throttleMs: 10 });
        editor.fireCursor(2, 25, 'mouse', CURSOR_REASON_EXPLICIT);
        vi.advanceTimersByTime(10);
        getIndex.mockClear();
        editor.fireCursor(2, 26, 'keyboard', 0 /* NotSet: a typed character */);
        vi.advanceTimersByTime(50);
        expect(store.getSnapshot().codeHighlight).toBeNull();
        expect(getIndex).not.toHaveBeenCalled();
    });

    it('geometry click → decorates the exact call range and reveals it, cursor untouched', () => {
        attach();
        store.linkFromGeometry({ shapeIndex: 0, kind: 'face', id: 3 }, 'fillet_1', { x: 10, y: 10 });
        const expected = index.byFeatureId.get('fillet_1')!.callRange!;
        expect(editor.decorations.map((d) => d.range)).toEqual([expected]);
        expect(editor.decorations[0]!.options.className).toBe('kc-code-link');
        expect(editor.revealed).toEqual([expected]);
        expect(editor.setPositionCalls).toBe(0);
    });

    it('no loop: geometry → code never produces code → geometry, and back', () => {
        attach();
        store.linkFromGeometry({ shapeIndex: 0, kind: 'face', id: 3 }, 'fillet_1', null);
        // Anything programmatic that moves the cursor is ignored.
        editor.setPosition({ lineNumber: 1, column: 15 });
        vi.advanceTimersByTime(50);
        expect(store.getSnapshot().codeHighlight).toBeNull();
        expect(store.getSnapshot().link?.featureId).toBe('fillet_1');

        // Code → geometry does not rewrite the link or re-reveal.
        const revealsBefore = editor.revealed.length;
        editor.fireCursor(1, 15, 'mouse', CURSOR_REASON_EXPLICIT);
        vi.advanceTimersByTime(10);
        expect(store.getSnapshot().codeHighlight).toEqual(['box_1']);
        expect(store.getSnapshot().link?.featureId).toBe('fillet_1');
        expect(editor.revealed.length).toBe(revealsBefore);

        // A new geometry click replaces the code highlight.
        store.linkFromGeometry({ shapeIndex: 0, kind: 'face', id: 0 }, 'box_1', null);
        expect(store.getSnapshot().codeHighlight).toBeNull();
    });

    it('falls back to the statement line when the call is not resolvable, clears on unknown', () => {
        const edited = `// note\n${CODE}`;
        const stale = buildFeatureSourceIndex(edited, FEATURES);
        attachCodeGeometrySync(editor, { store, getIndex: () => stale, throttleMs: 10 });
        store.linkFromGeometry({ shapeIndex: 0, kind: 'face', id: 0 }, 'box_1', null);
        expect(editor.decorations[0]!.range).toEqual(stale.byFeatureId.get('box_1')!.statementRange);
        store.linkFromGeometry({ shapeIndex: 0, kind: 'face', id: 0 }, null, null);
        expect(editor.decorations).toEqual([]);
    });

    it('applies an existing link on attach (Code tab opened after the click) and cleans up on dispose', () => {
        store.linkFromGeometry({ shapeIndex: 0, kind: 'face', id: 0 }, 'box_1', null);
        const sync = attach();
        expect(editor.decorations).toHaveLength(1);
        editor.fireCursor(2, 25, 'mouse', CURSOR_REASON_EXPLICIT);
        vi.advanceTimersByTime(10);
        sync.dispose();
        expect(editor.decorations).toEqual([]);
        expect(store.getSnapshot().codeHighlight).toBeNull();
    });
});
