// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
/**
 * Fast typing must never lose keystrokes. The workbench echoes each editor
 * change back as `code`; that echo can arrive after further keystrokes, so
 * it can be OLDER than the editor text. The Monaco wrapper writes a
 * controlled `value` back into the model whenever it differs, which dropped
 * every keystroke typed between an edit and its echo.
 */
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const workbench = vi.hoisted(() => ({ code: 'return 1;', setCode: vi.fn() }));
const fake = vi.hoisted(() => ({
    text: '',
    onChange: undefined as ((value: string | undefined) => void) | undefined,
    type(chars: string) {
        fake.text += chars;
        fake.onChange?.(fake.text);
    },
}));

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({
        features: [], geometries: [], validity: null, paramTable: null, diagnostics: [], recomputeMs: 0,
    }),
}));

vi.mock('../../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({ selectedFeatureId: null, selectFeature: vi.fn() }),
}));

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ code: workbench.code, setCode: workbench.setCode }),
}));

// Behaves like @monaco-editor/react: the model starts from `value` or
// `defaultValue`, user edits fire `onChange`, and a controlled `value` that
// differs from the model is written into it after the render commits.
vi.mock('@monaco-editor/react', () => ({
    __esModule: true,
    default: function MonacoEditorMock(props: {
        value?: string;
        defaultValue?: string;
        onChange?: (value: string | undefined) => void;
        onMount?: (editor: unknown, monaco: unknown) => void;
    }) {
        const { value, defaultValue, onChange, onMount } = props;
        const [initial] = React.useState(() => value ?? defaultValue ?? '');
        React.useEffect(() => {
            fake.text = initial;
        }, [initial]);
        React.useEffect(() => {
            fake.onChange = onChange;
        }, [onChange]);
        React.useEffect(() => {
            if (!onMount) return;
            const editor = {
                getModel: () => ({
                    getLineContent: () => '',
                    getFullModelRange: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }),
                }),
                getValue: () => fake.text,
                executeEdits: (_source: string, edits: { text: string }[]) => {
                    fake.text = edits[0].text;
                    fake.onChange?.(fake.text);
                },
                pushUndoStop: () => undefined,
                getPosition: () => ({ lineNumber: 1, column: 1 }),
                setPosition: () => undefined,
                revealLineInCenter: () => undefined,
                deltaDecorations: (_old: string[], next: unknown[]) => next.map((_, i) => `d${i}`),
                focus: () => undefined,
                onMouseDown: () => undefined,
            };
            onMount(editor, { MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 }, editor: { setModelMarkers: () => undefined } });
        }, [onMount]);
        React.useEffect(() => {
            if (value !== undefined && value !== fake.text) fake.text = value;
        }, [value]);
        return null;
    },
}));

import { CodeTab } from '../../tabs/CodeTab';

afterEach(() => {
    cleanup();
    workbench.code = 'return 1;';
    workbench.setCode.mockReset();
    fake.text = '';
    fake.onChange = undefined;
});

describe('CodeTab typing', () => {
    it('keeps keystrokes typed before the workbench echoes an earlier edit', () => {
        const { rerender } = render(<CodeTab />);
        expect(fake.text).toBe('return 1;');

        act(() => {
            fake.type(' a');
            fake.type('b');
        });
        expect(workbench.setCode).toHaveBeenLastCalledWith('return 1; ab');

        // The echo of the first keystroke lands after the second one.
        workbench.code = 'return 1; a';
        rerender(<CodeTab />);
        expect(fake.text).toBe('return 1; ab');

        workbench.code = 'return 1; ab';
        rerender(<CodeTab />);
        expect(fake.text).toBe('return 1; ab');
    });

    it('still shows code changed outside the editor', () => {
        const { rerender } = render(<CodeTab />);
        act(() => fake.type(' a'));
        workbench.code = 'return 1; a';
        rerender(<CodeTab />);

        workbench.code = 'return 2;';
        rerender(<CodeTab />);
        expect(fake.text).toBe('return 2;');

        // Code the editor typed earlier is external again once echoed.
        workbench.code = 'return 1; a';
        rerender(<CodeTab />);
        expect(fake.text).toBe('return 1; a');
    });
});
