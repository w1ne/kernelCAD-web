// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { attachMarkupSnapshotToPrompt, parseMarkupSnapshot } from './markupSnapshot';
import {
  MARKUP_NOTE_MAX_STROKE_POINTS,
  MARKUP_SNAPSHOT_MAX_MEASUREMENTS,
  MARKUP_SNAPSHOT_MAX_NOTES,
  MARKUP_SNAPSHOT_MAX_REFS_PER_ITEM,
  MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS,
} from './markupLimits';

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
  it('attaches a valid camera-only snapshot to a generation prompt', () => {
    const emptySnapshot = {
      ...sample,
      selection: { topologyRefs: [] },
      measurements: [],
      notes: [],
    };

    const prompt = attachMarkupSnapshotToPrompt('make a bracket', emptySnapshot);
    expect(prompt).toMatch(/^make a bracket\n\nStudio markup snapshot JSON \(schemaVersion 1\):/);
    const serialized = prompt.match(/Studio markup snapshot JSON \(schemaVersion 1\):\n(`{3,})json\n([\s\S]*?)\n\1/)?.[2];
    expect(serialized).toBeTruthy();
    const parsed = parseMarkupSnapshot(serialized!);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.camera).toEqual(emptySnapshot.camera);
    expect(parsed.selection.topologyRefs).toEqual([]);
    expect(parsed.measurements).toEqual([]);
    expect(parsed.notes).toEqual([]);
  });

  it.each([
    ['selection', { ...sample, selection: { topologyRefs: sample.selection.topologyRefs }, measurements: [], notes: [] }],
    ['measurement', { ...sample, selection: { topologyRefs: [] }, measurements: sample.measurements, notes: [] }],
    ['note', { ...sample, selection: { topologyRefs: [] }, measurements: [], notes: sample.notes }],
  ] as const)('attaches a snapshot when it contains a %s', (_kind, snapshot) => {
    const prompt = attachMarkupSnapshotToPrompt('make a bracket', snapshot);
    expect(prompt).toContain('Studio markup snapshot JSON (schemaVersion 1):');
    expect(parseMarkupSnapshot(prompt.match(/Studio markup snapshot JSON \(schemaVersion 1\):\n(`{3,})json\n([\s\S]*?)\n\1/)![2]!)).toMatchObject({ schemaVersion: 1 });
  });

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

  it('rejects duplicate note and measurement IDs with a field-specific validation error', async () => {
    const api = await import('./markupSnapshot');
    const duplicateNote = { ...sample.notes[0], id: sample.notes[0].id };
    const duplicateMeasurement = { ...sample.measurements[0], id: sample.measurements[0].id };

    const notes = api.markupSnapshotSchema.safeParse({
      ...sample,
      notes: [sample.notes[0], duplicateNote],
    });
    const measurements = api.markupSnapshotSchema.safeParse({
      ...sample,
      measurements: [sample.measurements[0], duplicateMeasurement],
    });

    expect(notes.success).toBe(false);
    expect(notes.error?.issues.map((issue) => issue.message).join(' ')).toMatch(/duplicate note id/i);
    expect(measurements.success).toBe(false);
    expect(measurements.error?.issues.map((issue) => issue.message).join(' ')).toMatch(/duplicate measurement id/i);
  });

  it('rejects distance values that disagree with their endpoints beyond tolerance', async () => {
    const api = await import('./markupSnapshot');
    expect(api.markupSnapshotSchema?.safeParse).toEqual(expect.any(Function));
    if (!api.markupSnapshotSchema) return;

    const inconsistentDistance = {
      ...sample.measurements[0],
      value: 5.000002,
    };
    expect(api.markupSnapshotSchema.safeParse({
      ...sample,
      measurements: [inconsistentDistance],
    }).success).toBe(false);
  });

  it('accepts distance float noise within tolerance and validates a matching diameter', async () => {
    const api = await import('./markupSnapshot');
    expect(api.markupSnapshotSchema?.safeParse).toEqual(expect.any(Function));
    if (!api.markupSnapshotSchema) return;

    const nearDistance = {
      ...sample.measurements[0],
      value: 5.0000005,
    };
    const independentDiameter = {
      ...sample.measurements[0],
      id: 'diameter-1',
      type: 'diameter' as const,
      value: 5,
    };

    expect(api.markupSnapshotSchema.safeParse({ ...sample, measurements: [nearDistance] }).success).toBe(true);
    expect(api.markupSnapshotSchema.safeParse({ ...sample, measurements: [independentDiameter] }).success).toBe(true);
  });

  it('rejects a diameter value that disagrees with its endpoint length beyond tolerance', async () => {
    const api = await import('./markupSnapshot');
    const inconsistentDiameter = {
      ...sample.measurements[0],
      id: 'diameter-1',
      type: 'diameter' as const,
      value: 8,
    };

    expect(api.markupSnapshotSchema.safeParse({
      ...sample,
      measurements: [inconsistentDiameter],
    }).success).toBe(false);
  });

  it('rejects a snapshot with more topology references than the supported bound', async () => {
    const api = await import('./markupSnapshot');
    const topologyRefs = Array.from({ length: MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS + 1 }, (_, id) => ({ shapeIndex: 0, kind: 'face' as const, id }));

    expect(api.markupSnapshotSchema.safeParse({
      ...sample,
      selection: { topologyRefs },
    }).success).toBe(false);
  });

  it('bounds every collection in the snapshot schema', async () => {
    const api = await import('./markupSnapshot');
    const topologyRef = { shapeIndex: 0, kind: 'face' as const, id: 0 };
    const overflowCases = [
      {
        snapshot: {
          ...sample,
          measurements: Array.from({ length: MARKUP_SNAPSHOT_MAX_MEASUREMENTS + 1 }, (_, index) => ({
            ...sample.measurements[0], id: `measurement-${index}`, refs: [],
          })),
        },
      },
      {
        snapshot: {
          ...sample,
          notes: Array.from({ length: MARKUP_SNAPSHOT_MAX_NOTES + 1 }, (_, index) => ({
            ...sample.notes[0], id: `note-${index}`, refs: [],
          })),
        },
      },
      {
        snapshot: {
          ...sample,
          measurements: [{
            ...sample.measurements[0],
            refs: Array.from({ length: MARKUP_SNAPSHOT_MAX_REFS_PER_ITEM + 1 }, (_, id) => ({ ...topologyRef, id })),
          }],
        },
      },
      {
        snapshot: {
          ...sample,
          notes: [{
            ...sample.notes[0],
            refs: Array.from({ length: MARKUP_SNAPSHOT_MAX_REFS_PER_ITEM + 1 }, (_, id) => ({ ...topologyRef, id })),
          }],
        },
      },
      {
        snapshot: {
          ...sample,
          notes: [{
            ...sample.notes[0],
            strokePoints: Array.from({ length: MARKUP_NOTE_MAX_STROKE_POINTS + 1 }, () => [0, 0, 0] as [number, number, number]),
          }],
        },
      },
    ];

    for (const { snapshot } of overflowCases) {
      expect(api.markupSnapshotSchema.safeParse(snapshot).success).toBe(false);
    }
  });

  it('rejects the final prompt when appending markup would exceed the prompt character limit', () => {
    expect(() => attachMarkupSnapshotToPrompt('x'.repeat(63_000), sample)).toThrow(
      /prompt plus Studio markup exceeds 63,000 characters.*remove some notes, measurements, or picked topology/i,
    );
  });
});
