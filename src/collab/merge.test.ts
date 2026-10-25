// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { captureFeatureGraph } from './featureGraph';
import { liftChangeSet } from './changeSet';
import { mergeChangeSet } from './merge';
import type { ChangeSet } from './types';

const meta = { baseRevision: 1, agentId: 'agent-yours', idempotencyKey: 'key-1' };

async function merge(baseSource: string, headSource: string, yoursSource: string) {
  const base = await captureFeatureGraph(baseSource, { fileName: 'base.kcad.ts' });
  const head = await captureFeatureGraph(headSource, { fileName: 'head.kcad.ts' });
  const yoursGraph = await captureFeatureGraph(yoursSource, { fileName: 'yours.kcad.ts' });
  const yours = liftChangeSet(base, yoursGraph, meta);
  return mergeChangeSet({ baseSource, headSource, yoursSource, base, head, yours });
}

describe('mergeChangeSet', () => {
  it('rejects the same param set to different values with all three values', async () => {
    const result = await merge(
      "const wall = param('wall', 2); return box(wall, 10, 10);",
      "const wall = param('wall', 3); return box(wall, 10, 10);",
      "const wall = param('wall', 4); return box(wall, 10, 10);",
    );
    expect(result).toEqual({
      status: 'conflict',
      conflicts: [
        { code: 'collab.conflict.param', target: '$project', name: 'wall', base: 2, head: 3, yours: 4 },
      ],
    });
  });

  it('merges the same value set on both sides', async () => {
    const result = await merge(
      "const wall = param('wall', 2); return box(wall, 10, 10);",
      "const wall = param('wall', 4); return box(wall, 10, 10);",
      "const wall = param('wall', 4); return box(wall, 10, 10);",
    );
    expect(result.status).toBe('merged');
    if (result.status === 'merged') expect(result.graph.params.wall).toBe(4);
  });

  it('rebases disjoint edits submitted against a stale base', async () => {
    const result = await merge(
      "const wall = param('wall', 2); const depth = param('depth', 10); return box(wall, depth, 10);",
      "const wall = param('wall', 3); const depth = param('depth', 10); return box(wall, depth, 10);",
      "const wall = param('wall', 2); const depth = param('depth', 20); return box(wall, depth, 10);",
    );
    expect(result.status).toBe('merged');
    if (result.status !== 'merged') return;
    expect(result.rebased).toBe(true);
    expect(result.graph.params.wall).toBe(3);
    expect(result.graph.params.depth).toBe(20);
    expect(result.source).toContain("param('wall', 3)");
    expect(result.source).toContain("param('depth', 20)");
  });

  it('rejects a reference to a feature head deleted', async () => {
    const baseSource = 'const a = box(10, 10, 10); const b = cylinder(4, 2); return a;';
    const headSource = 'const a = box(10, 10, 10); return a;';
    const base = await captureFeatureGraph(baseSource, { fileName: 'base.kcad.ts' });
    const head = await captureFeatureGraph(headSource, { fileName: 'head.kcad.ts' });
    const yours: ChangeSet = {
      ...meta,
      ops: [{ op: 'setRef', id: 'box_1', slot: 'phantom', from: [], to: ['cylinder_1'] }],
      writeSet: ['box_1', 'cylinder_1'],
    };
    const result = await mergeChangeSet({ baseSource, headSource, yoursSource: headSource, base, head, yours });
    expect(result).toMatchObject({
      status: 'conflict',
      conflicts: [{ code: 'collab.conflict.deleted-ref', id: 'box_1', slot: 'phantom', deleted: 'cylinder_1' }],
    });
  });

  it('rejects a reference cycle created by the change-set', async () => {
    const source = 'const a = box(10, 10, 10); const b = box(5, 5, 5); return a.union(b);';
    const graph = await captureFeatureGraph(source, { fileName: 'model.kcad.ts' });
    const yours: ChangeSet = {
      ...meta,
      ops: [
        { op: 'setRef', id: 'box_1', slot: 'loop', from: [], to: ['box_2'] },
        { op: 'setRef', id: 'box_2', slot: 'loop', from: [], to: ['box_1'] },
      ],
      writeSet: ['box_1', 'box_2'],
    };
    const result = await mergeChangeSet({
      baseSource: source,
      headSource: source,
      yoursSource: source,
      base: graph,
      head: graph,
      yours,
    });
    expect(result).toMatchObject({
      status: 'conflict',
      conflicts: [{ code: 'collab.conflict.cycle' }],
    });
  });

  it('merges inserts after the same anchor with head first', async () => {
    const baseSource = 'const plate = box(10, 10, 10);\nreturn plate;';
    const headSource = "const plate = box(10, 10, 10);\nconst filleted = plate.fillet(1, 'top');\nreturn plate;";
    const yoursSource = "const plate = box(10, 10, 10);\nconst chamfered = plate.chamfer(1, 'top');\nreturn plate;";
    const result = await merge(baseSource, headSource, yoursSource);
    expect(result.status).toBe('merged');
    if (result.status !== 'merged') return;
    expect(result.graph.order).toEqual(['box_1', 'fillet_1', 'chamfer_1']);
    expect(result.source.indexOf('fillet')).toBeLessThan(result.source.indexOf('chamfer'));
  });

  it('merges different params of the same feature', async () => {
    const result = await merge(
      'const plate = box(10, 10, 10); return plate;',
      'const plate = box(12, 10, 10); return plate;',
      'const plate = box(10, 14, 10); return plate;',
    );
    expect(result.status).toBe('merged');
    if (result.status !== 'merged') return;
    expect(result.graph.features.get('box_1')?.params).toMatchObject({ x: 12, y: 14, z: 10 });
    expect(result.source).toContain('box(12, 14, 10)');
  });

  it('rejects both sides editing the same unowned helper', async () => {
    const baseSource = 'const helper = () => 2;\nreturn box(10, 10, 10);';
    const headSource = 'const helper = () => 3;\nreturn box(10, 10, 10);';
    const yoursSource = 'const helper = () => 4;\nreturn box(10, 10, 10);';
    const result = await merge(baseSource, headSource, yoursSource);
    expect(result).toMatchObject({
      status: 'conflict',
      conflicts: [{ code: 'collab.conflict.unowned' }],
    });
  });
});
