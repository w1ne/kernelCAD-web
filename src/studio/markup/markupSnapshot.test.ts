// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';

const sample = {
  schemaVersion: 1 as const,
  camera: {
    position: [12, 8, 16] as [number, number, number],
    target: [1, 2, 3] as [number, number, number],
    up: [0, 0, 1] as [number, number, number],
    projection: 'perspective' as const,
    fov: 40,
    zoom: 1.2,
  },
  selection: { topologyRefs: [{ shapeIndex: 0, kind: 'face' as const, id: 4 }] },
  measurements: [{
    id: 'distance-1', type: 'distance' as const, endpoints: [[0, 0, 0], [3, 4, 0]] as [[number, number, number], [number, number, number]],
    refs: [{ shapeIndex: 0, kind: 'edge' as const, id: 2 }], value: 5, units: 'mm' as const,
  }],
  notes: [{
    id: 'note-1', text: 'Move this face outward', anchor: [2, 3, 4] as [number, number, number],
    refs: [{ shapeIndex: 0, kind: 'face' as const, id: 4 }],
  }],
};

describe('Studio markup snapshots', () => {
  it('serializes, validates, and replays the same camera, selection, notes, and measurements', async () => {
    const api = await import('./markupSnapshot');
    expect(api.serializeMarkupSnapshot).toEqual(expect.any(Function));
    expect(api.parseMarkupSnapshot).toEqual(expect.any(Function));
    expect(api.replayMarkupSnapshot).toEqual(expect.any(Function));
    if (!api.serializeMarkupSnapshot || !api.parseMarkupSnapshot || !api.replayMarkupSnapshot) return;

    const serialized = api.serializeMarkupSnapshot(sample);
    const parsed = api.parseMarkupSnapshot(serialized);
    const replayed = api.replayMarkupSnapshot(parsed);

    expect(replayed.camera).toEqual(sample.camera);
    expect(replayed.selection).toEqual(sample.selection);
    expect(replayed.notes).toEqual(sample.notes);
    expect(replayed.measurements).toEqual(sample.measurements);
  });

  it('computes a point-to-point measurement from model coordinates', async () => {
    const api = await import('./markupSnapshot');
    expect(api.makeDistanceMeasurement).toEqual(expect.any(Function));
    if (!api.makeDistanceMeasurement) return;

    const measurement = api.makeDistanceMeasurement({
      id: 'known-distance',
      a: [0, 0, 0],
      b: [3, 4, 0],
      refs: [],
    });

    expect(measurement.value).toBe(5);
    expect(measurement.units).toBe('mm');
    expect(measurement.endpoints).toEqual([[0, 0, 0], [3, 4, 0]]);
  });

  it('rejects a snapshot with an unsupported schema version', async () => {
    const api = await import('./markupSnapshot');
    expect(api.markupSnapshotSchema?.safeParse).toEqual(expect.any(Function));
    if (!api.markupSnapshotSchema) return;

    expect(api.markupSnapshotSchema.safeParse({ ...sample, schemaVersion: 2 }).success).toBe(false);
  });
});
