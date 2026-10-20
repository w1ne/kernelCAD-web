// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarkupPanel } from './MarkupPanel';
import { DEFAULT_MARKUP_CAMERA, markupStore } from '../../../markup/markupStore';
import { MARKUP_NOTE_MAX_LENGTH, MARKUP_SNAPSHOT_MAX_MEASUREMENTS, MARKUP_SNAPSHOT_MAX_NOTES } from '../../../markup/markupLimits';

const note = {
  id: 'editable-note',
  text: 'Keep the mounting face flat',
  anchor: [1, 2, 3] as [number, number, number],
  refs: [],
};

beforeEach(() => {
  markupStore.clear();
  markupStore.setCamera(DEFAULT_MARKUP_CAMERA);
  markupStore.openPanel();
  markupStore.addNote(note);
});

afterEach(() => {
  cleanup();
  markupStore.clear();
  markupStore.setCamera(DEFAULT_MARKUP_CAMERA);
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

  it('shows a clear error when another note would exceed the snapshot limit', () => {
    for (let index = 1; index < MARKUP_SNAPSHOT_MAX_NOTES; index += 1) {
      markupStore.addNote({ ...note, id: `note-${index}` });
    }
    render(<MarkupPanel />);

    act(() => markupStore.addNote({ ...note, id: 'overflow-note' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/128 notes.*remove a note/i);
  });

  it('shows a clear error when another measurement would exceed the snapshot limit', () => {
    const measurement = {
      id: 'measurement',
      type: 'distance' as const,
      endpoints: [[0, 0, 0], [3, 4, 0]] as [[number, number, number], [number, number, number]],
      refs: [],
      value: 5,
      units: 'mm' as const,
    };
    for (let index = 0; index < MARKUP_SNAPSHOT_MAX_MEASUREMENTS; index += 1) {
      markupStore.addMeasurement({ ...measurement, id: `measurement-${index}` });
    }
    render(<MarkupPanel />);

    act(() => markupStore.addMeasurement({ ...measurement, id: 'overflow-measurement' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/128 measurements.*remove a measurement/i);
    expect(screen.queryByLabelText('Remove measurement overflow-measurement')).toBeNull();
  });

  it('reports a snapshot validation failure instead of throwing from Save JSON', () => {
    markupStore.setCamera({ ...DEFAULT_MARKUP_CAMERA, position: [Number.NaN, 0, 0] as [number, number, number] });
    render(<MarkupPanel />);

    expect(() => fireEvent.click(screen.getByRole('button', { name: /save json/i }))).not.toThrow();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not save snapshot/i);
  });
});
