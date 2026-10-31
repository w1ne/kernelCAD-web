// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { captureFeatureGraph } from './featureGraph';
import { liftChangeSet } from './changeSet';

const meta = { baseRevision: 7, agentId: 'agent-a', idempotencyKey: 'test-key' };

async function lift(base: string, edited: string) {
  return liftChangeSet(
    await captureFeatureGraph(base, { fileName: 'model.kcad.ts' }),
    await captureFeatureGraph(edited, { fileName: 'model.kcad.ts' }),
    meta,
  );
}

describe('liftChangeSet', () => {
  it('lifts a project param edit to one setParam', async () => {
    const changeSet = await lift(
      "const wall = param('wall', 2); return box(wall, 10, 10);",
      "const wall = param('wall', 3); return box(wall, 10, 10);",
    );
    expect(changeSet.ops).toEqual([
      { op: 'setParam', target: '$project', name: 'wall', from: 2, to: 3 },
    ]);
    expect(changeSet.writeSet).toEqual(['$project']);
  });

  it('lifts an appended fillet to insertFeature after the last feature', async () => {
    const changeSet = await lift(
      'const plate = box(10, 10, 10); return plate;',
      "const plate = box(10, 10, 10); return plate.fillet(1, 'top');",
    );
    expect(changeSet.ops).toHaveLength(1);
    expect(changeSet.ops[0]).toMatchObject({
      op: 'insertFeature',
      id: 'fillet_1',
      after: 'box_1',
    });
    expect(changeSet.writeSet).toEqual(['box_1', 'fillet_1']);
  });

  it('lifts a removed feature to deleteFeature', async () => {
    const changeSet = await lift(
      'const plate = box(10, 10, 10); const pin = cylinder(4, 2); return plate;',
      'const plate = box(10, 10, 10); return plate;',
    );
    expect(changeSet.ops).toEqual([{ op: 'deleteFeature', id: 'cylinder_1' }]);
  });

  it('lifts a reorder to moveFeature', async () => {
    const changeSet = await lift(
      'const a = box(10, 10, 10); const b = cylinder(4, 2); return a.union(b);',
      'const b = cylinder(4, 2); const a = box(10, 10, 10); return a.union(b);',
    );
    const moves = changeSet.ops.filter((op) => op.op === 'moveFeature');
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ op: 'moveFeature' });
  });

  it('lifts a changed helper function to editUnowned', async () => {
    const changeSet = await lift(
      'const helper = () => 2;\nreturn box(10, 10, 10);',
      'const helper = () => 3;\nreturn box(10, 10, 10);',
    );
    expect(changeSet.ops).toEqual([
      { op: 'editUnowned', span: expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }) },
    ]);
    expect(changeSet.writeSet).toEqual(['$unowned']);
  });

  it('returns no ops when nothing changed', async () => {
    const changeSet = await lift(
      'const plate = box(10, 10, 10); return plate;',
      'const plate = box(10, 10, 10); return plate;',
    );
    expect(changeSet.ops).toEqual([]);
    expect(changeSet.writeSet).toEqual([]);
  });
});
