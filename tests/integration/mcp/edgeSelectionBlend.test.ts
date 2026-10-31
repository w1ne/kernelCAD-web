// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Core half of edge picking: the mesh carries a stable ID per edge range, the
// IDs survive re-evaluation, and apply_surface_blend accepts the picked refs.
// The Studio selection endpoint round-trip is tested in kernelCAD-app.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/composition/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshFeaturesPerFeature } from '../../../src/modeling/capture/featureMeshing';
import { applySurfaceBlendTool } from '../../../src/agent/mcp/tools/applySurfaceBlend';

const CODE = 'const body = box(10, 10, 10);\nreturn body;';

beforeAll(async () => { await initOcct(); });

async function meshedBox() {
  const model = await buildModel({ code: CODE, fileName: 'edge-pick.kcad.ts' });
  const meshed = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
  const feature = meshed.features.find(candidate => candidate.edgeStableIds?.length);
  expect(feature).toBeDefined();
  return feature!;
}

/** Two vertical box edges on opposite corners, the way a user would pick them. */
function farVerticalEdgePair(feature: Awaited<ReturnType<typeof meshedBox>>): string[] {
  const ranges = feature.edgeRanges!;
  const positions = feature.edges!;
  const vertex = (index: number) => [positions[index * 3]!, positions[index * 3 + 1]!, positions[index * 3 + 2]!];
  const edges = feature.edgeStableIds!.map((stableId, id) => {
    const start = ranges[id * 2]!;
    const count = ranges[id * 2 + 1]!;
    const first = vertex(start);
    const last = vertex(start + count - 1);
    return { stableId, center: first.map((v, axis) => (v + last[axis]!) / 2), direction: last.map((v, axis) => v - first[axis]!) };
  }).filter(edge => Math.abs(edge.direction[2]!) > Math.abs(edge.direction[0]!) + Math.abs(edge.direction[1]!));
  expect(edges).toHaveLength(4);
  let pair: string[] = [];
  let farthest = 0;
  for (const a of edges) for (const b of edges) {
    const distance = Math.hypot(...a.center.map((v, axis) => v - b.center[axis]!));
    if (distance > farthest) { farthest = distance; pair = [a.stableId, b.stableId]; }
  }
  return pair;
}

describe('picked stable edge refs drive apply_surface_blend', () => {
  it('assigns the same stable edge IDs when the script is evaluated again', async () => {
    const first = await meshedBox();
    const second = await meshedBox();
    expect(first.edgeStableIds).toHaveLength(12);
    expect(new Set(first.edgeStableIds).size).toBe(12);
    for (const id of first.edgeStableIds!) expect(id).toMatch(/^s[0-9a-f]{16}$/);
    expect(second.edgeStableIds).toEqual(first.edgeStableIds);
  });

  it.each([
    ['fillet', { radius: 1 }, 1000 - 2 * (1 - Math.PI / 4) * 10],
    ['chamfer', { operation: 'chamfer' as const, distance: 1 }, 990],
  ] as const)('applies two picked edges as a %s selector', async (_operation, amount, expectedVolume) => {
    const feature = await meshedBox();
    const refs = farVerticalEdgePair(feature).map(stableId => `@kc[${feature.featureId}/edge/${stableId}]`);
    const out = await applySurfaceBlendTool({ code: CODE, shape_binding: 'body', ...amount, selector: refs });
    expect(out.ok).toBe(true);
    for (const ref of refs) expect(out.new_code).toContain(ref);
    expect(out.new_code).toMatch(/return _surface_blend(_\d+)?;/);
    expect(out.sceneSummary?.valid).toBe(true);
    expect(out.sceneSummary?.volume).toBeCloseTo(expectedVolume, 2);
  });

  it('rejects a stable ref that matches no edge on the current shape', async () => {
    const feature = await meshedBox();
    const out = await applySurfaceBlendTool({
      code: CODE, shape_binding: 'body', radius: 1, selector: [`@kc[${feature.featureId}/edge/s0000000000000000]`],
    });
    expect(out.ok).toBe(false);
  });
});
