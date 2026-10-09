import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { binaryStl } from '../../../src/kernel/fea/heatmap';
import { parseBinaryStl, readRenderBodies, writeRenderBodies } from '../../../src/kernel/fea/renderBodies';
import { bodyToFeatureMesh, sceneBounds } from '../../../src/agent/render/meshScenesRender';

describe('render bodies', () => {
  it('round-trips triangles through the binary STL writer', () => {
    const tris = [
      [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
      [[0, 0, 1], [2, 0, 1], [0, 3, 1]],
    ] as const;
    const parsed = parseBinaryStl(binaryStl(tris));
    expect(Array.from(parsed)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 1, 0, 3, 1]);
  });

  it('reads back the sidecar, and reports a missing one as undefined', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kc-bodies-'));
    try {
      expect(await readRenderBodies(dir)).toBeUndefined();
      await writeRenderBodies(dir, [{ name: 'low', color: '#9aa5b1', file: 'band-0.stl' }]);
      expect(await readRenderBodies(dir)).toEqual([{ name: 'low', color: '#9aa5b1', file: 'band-0.stl' }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('builds a flat-shaded display mesh with outward facet normals', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const mesh = bodyToFeatureMesh({ name: 'b', color: '#ff0000', positions }, 3);
    expect(mesh.featureId).toBe('body_3');
    expect(mesh.color).toBe('#ff0000');
    expect(mesh.faces).toHaveLength(1);
    expect(mesh.faces[0].indices).toEqual([0, 1, 2]);
    expect(mesh.faces[0].normals.slice(0, 3)).toEqual([0, 0, 1]);
  });

  it('computes the bounds of all bodies of a scene', () => {
    const a = { name: 'a', color: '#000', positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) };
    const b = { name: 'b', color: '#000', positions: new Float32Array([5, -2, 1, 6, 0, 0, 0, 0, 9]) };
    expect(sceneBounds([a, b])).toEqual({ min: [0, -2, 0], max: [6, 1, 9] });
  });
});
