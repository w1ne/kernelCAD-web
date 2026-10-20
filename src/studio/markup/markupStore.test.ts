// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { StudioMarkupStore } from './markupStore';
import type { MarkupSnapshot } from './markupSnapshot';

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
