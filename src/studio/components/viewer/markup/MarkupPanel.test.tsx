// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarkupPanel } from './MarkupPanel';
import { markupStore } from '../../../markup/markupStore';
import { MARKUP_NOTE_MAX_LENGTH } from '../../../markup/markupLimits';

const note = {
  id: 'editable-note',
  text: 'Keep the mounting face flat',
  anchor: [1, 2, 3] as [number, number, number],
  refs: [],
};

beforeEach(() => {
  markupStore.clear();
  markupStore.openPanel();
  markupStore.addNote(note);
});

afterEach(() => {
  cleanup();
  markupStore.clear();
});

describe('MarkupPanel note editing', () => {
  it('limits the editor to the schema length and preserves the last valid note on invalid input', () => {
    render(<MarkupPanel />);
    const editor = screen.getByLabelText('Edit note 1') as HTMLTextAreaElement;

    expect(editor.maxLength).toBe(MARKUP_NOTE_MAX_LENGTH);
    expect(() => fireEvent.change(editor, { target: { value: 'x'.repeat(MARKUP_NOTE_MAX_LENGTH + 1) } })).not.toThrow();
    expect(editor).toHaveValue(note.text);
    expect(markupStore.getSnapshot().notes).toEqual([note]);
  });
});
