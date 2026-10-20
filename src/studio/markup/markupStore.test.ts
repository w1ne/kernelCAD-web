// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { StudioMarkupStore } from './markupStore';
import type { MarkupSnapshot } from './markupSnapshot';
import {
  MARKUP_NOTE_MAX_LENGTH,
  MARKUP_SNAPSHOT_MAX_MEASUREMENTS,
  MARKUP_SNAPSHOT_MAX_NOTES,
  MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS,
} from './markupLimits';

const sample: MarkupSnapshot = {
  schemaVersion: 1,
  camera: {
    position: [10, 8, 6], target: [0, 0, 0], up: [0, 0, 1],
    projection: 'perspective', fov: 40, zoom: 1,
  },
  selection: { topologyRefs: [{ shapeIndex: 1, kind: 'face', id: 8 }] },
  measurements: [{
    id: 'm1', type: 'distance', endpoints: [[0, 0, 0], [0, 0, 10]],
    refs: [{ shapeIndex: 1, kind: 'edge', id: 3 }], value: 10, units: 'mm',
  }],
  notes: [{
    id: 'n1', text: 'Keep this face flat', anchor: [1, 2, 3],
    refs: [{ shapeIndex: 1, kind: 'face', id: 8 }],
  }],
};

describe('Studio markup store', () => {
  it('restores camera, selection, notes and measurements from a snapshot', () => {
    const store = new StudioMarkupStore();

    store.loadSnapshot(sample);

    expect(store.getSnapshot()).toMatchObject({
      panelOpen: true,
      mode: 'off',
      notes: sample.notes,
      measurements: sample.measurements,
      topologyRefs: sample.selection.topologyRefs,
      lastSnapshot: sample,
    });
    expect(store.consumeCameraRestore()).toEqual(sample.camera);
    expect(store.captureSnapshot()).toEqual(sample);
  });

  it('edits and removes notes and measurements in the captured snapshot', () => {
    const store = new StudioMarkupStore();
    store.addNote(sample.notes[0]!);
    store.addMeasurement(sample.measurements[0]!);

    store.updateNote('n1', 'Keep the mounting face flat');
    store.removeMeasurement('m1');

    expect(store.captureSnapshot().notes).toEqual([
      { ...sample.notes[0]!, text: 'Keep the mounting face flat' },
    ]);
    expect(store.captureSnapshot().measurements).toEqual([]);
    store.removeNote('n1');
    expect(store.captureSnapshot().notes).toEqual([]);
  });

  it('ignores an invalid overlong note edit without throwing or changing the saved note', () => {
    const store = new StudioMarkupStore();
    store.addNote(sample.notes[0]!);

    expect(() => store.updateNote('n1', 'x'.repeat(MARKUP_NOTE_MAX_LENGTH + 1))).not.toThrow();
    expect(store.getSnapshot().notes).toEqual(sample.notes);
  });

  it('rejects duplicate note and measurement IDs without duplicating store entries', () => {
    const store = new StudioMarkupStore();
    store.addNote(sample.notes[0]!);
    store.addMeasurement(sample.measurements[0]!);

    expect(store.addNote(sample.notes[0]!)).toBe(false);
    expect(store.getSnapshot().notes).toEqual(sample.notes);
    expect(store.getSnapshot().error).toMatch(/note ID.*already exists/i);

    expect(store.addMeasurement(sample.measurements[0]!)).toBe(false);
    expect(store.getSnapshot().measurements).toEqual(sample.measurements);
    expect(store.getSnapshot().error).toMatch(/measurement ID.*already exists/i);
  });

  it('keeps multi-pick topology within the replayable snapshot limit', () => {
    const store = new StudioMarkupStore();
    const refs = Array.from({ length: MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS + 1 }, (_, id) => ({
      shapeIndex: 0,
      kind: 'face' as const,
      id,
    }));

    store.setSelection(refs);

    expect(store.getSnapshot().topologyRefs).toEqual([]);
    expect(store.getSnapshot().error).toMatch(/256 faces or edges.*clear some picked topology/i);
  });

  it('rejects a note beyond the snapshot limit with an actionable error', () => {
    const store = new StudioMarkupStore();
    for (let index = 0; index < MARKUP_SNAPSHOT_MAX_NOTES; index += 1) {
      store.addNote({ ...sample.notes[0]!, id: `note-${index}` });
    }

    const accepted = store.addNote({ ...sample.notes[0]!, id: 'overflow-note' });

    expect(accepted).toBe(false);
    expect(store.getSnapshot().notes.some((item) => item.id === 'overflow-note')).toBe(false);
    expect(store.getSnapshot().error).toMatch(/128 notes.*remove a note/i);
  });

  it('rejects a measurement beyond the snapshot limit with an actionable error', () => {
    const store = new StudioMarkupStore();
    for (let index = 0; index < MARKUP_SNAPSHOT_MAX_MEASUREMENTS; index += 1) {
      store.addMeasurement({ ...sample.measurements[0]!, id: `measurement-${index}` });
    }

    const accepted = store.addMeasurement({ ...sample.measurements[0]!, id: 'overflow-measurement' });

    expect(accepted).toBe(false);
    expect(store.getSnapshot().measurements.some((item) => item.id === 'overflow-measurement')).toBe(false);
    expect(store.getSnapshot().error).toMatch(/128 measurements.*remove a measurement/i);
  });

  it('toggles note placement with the panel and clears saved markup on demand', () => {
    const store = new StudioMarkupStore();
    store.addNote(sample.notes[0]!);
    store.openPanel();
    expect(store.getSnapshot()).toMatchObject({ panelOpen: true, mode: 'note' });

    store.closePanel();
    expect(store.getSnapshot()).toMatchObject({ panelOpen: false, mode: 'off', notes: sample.notes });
    store.clear();
    expect(store.captureSnapshot()).toMatchObject({
      selection: { topologyRefs: [] },
      measurements: [],
      notes: [],
    });
  });
});
