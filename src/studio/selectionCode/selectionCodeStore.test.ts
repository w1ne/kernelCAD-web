// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { SelectionCodeStore } from './selectionCodeStore';

describe('topology multi-selection', () => {
  it('replaces on plain picks and toggles edge identities with Shift/Ctrl picks', () => {
    const store = new SelectionCodeStore();
    const edgeA = { shapeIndex: 0, kind: 'edge' as const, id: 2 };
    const edgeB = { shapeIndex: 0, kind: 'edge' as const, id: 4 };

    store.selectFromGeometry(edgeA, 'box_1', null, false, 's1111111111111111');
    store.selectFromGeometry(edgeB, 'box_1', null, true, 's2222222222222222');
    expect(store.getSnapshot().topologySelections.map(selection => selection.stableId))
      .toEqual(['s1111111111111111', 's2222222222222222']);
    expect(store.getSnapshot().link?.stableId).toBe('s2222222222222222');

    store.selectFromGeometry(edgeA, 'box_1', null, true, 's1111111111111111');
    expect(store.getSnapshot().topologySelections.map(selection => selection.stableId))
      .toEqual(['s2222222222222222']);

    store.selectFromGeometry({ shapeIndex: 1, kind: 'face', id: 8 }, 'extrude_1', null, false);
    expect(store.getSnapshot().topologySelections.map(selection => selection.pick))
      .toEqual([{ shapeIndex: 1, kind: 'face', id: 8 }]);
    expect(store.getSnapshot().link?.ref).toBeUndefined();
  });
});
