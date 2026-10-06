// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO, type Document } from '@gltf-transform/core';
import { buildModel } from '../../../../../src/composition/buildModel';
import { initOcct } from '../../../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../../../../../src/kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../../../src/kernel/backends/occt/sceneToWorldFrame';
import { exportGlbAsync } from '../../../../../src/kernel/backends/occt/exportGlb';
import { canExportInstanced, exportSceneGlbInstancedAsync } from '../../../../../src/kernel/backends/occt/exportGlbInstanced';

const ROW = `
  const arm = assembly('row');
  const shapes = [
    () => box(40, 20, 4).subtract(box(4, 4, 10).translate(10, 10, -2)),
    () => box(5, 5, 50),
    () => box(10, 10, 10),
  ];
  for (let i = 0; i < 12; i++) {
    arm.part('p' + i, shapes[i % 3](), { at: [i * 60, 0, 0], rotate: i % 2 === 0 ? [0, 0, 0] : { axis: [0, 0, 1], degrees: 90 } });
  }
  return arm.model();
`;

type Box = { min: number[]; max: number[] };

function transformPoint(m: ArrayLike<number>, p: number[]): number[] {
  return [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
}

/** World AABB per named mesh node (local accessor bounds through the world matrix). */
function nodeBoxes(doc: Document): Map<string, Box> {
  const out = new Map<string, Box>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const pos = mesh.listPrimitives()[0].getAttribute('POSITION')!;
    const lo = pos.getMin([]);
    const hi = pos.getMax([]);
    const world = node.getWorldMatrix();
    const box: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) {
      const w = transformPoint(world, [x, y, z]);
      for (let i = 0; i < 3; i++) { box.min[i] = Math.min(box.min[i], w[i]); box.max[i] = Math.max(box.max[i], w[i]); }
    }
    out.set(node.getName(), box);
  }
  return out;
}

describe('instanced GLB export', () => {
  let scene: SceneBackend;
  beforeAll(async () => {
    await initOcct();
    const model = await buildModel({ code: ROW, fileName: 'row.kcad.ts' });
    if (!isSceneBackend(model.rootShape)) throw new Error('expected a scene');
    scene = model.rootShape;
  }, 120_000);

  it('applies to a scene with repeated geometry keys', () => {
    expect(canExportInstanced(scene)).toBe(true);
  });

  it('writes one mesh per geometry and one node per part with the same world boxes as the baked export', async () => {
    const io = new NodeIO();
    const shared = await io.readBinary(await exportSceneGlbInstancedAsync(scene, { format: 'glb' }));
    const baked = await io.readBinary(await exportGlbAsync(sceneToWorldFrameParts(scene), { format: 'glb' }));
    expect(shared.getRoot().listMeshes()).toHaveLength(3);
    const sharedBoxes = nodeBoxes(shared);
    const bakedBoxes = nodeBoxes(baked);
    expect(sharedBoxes.size).toBe(12);
    for (const [name, b] of bakedBoxes) {
      const s = sharedBoxes.get(name)!;
      for (let i = 0; i < 3; i++) {
        expect(s.min[i], `${name} min[${i}]`).toBeCloseTo(b.min[i], 3);
        expect(s.max[i], `${name} max[${i}]`).toBeCloseTo(b.max[i], 3);
      }
    }
  }, 120_000);

  it('keeps the shared local shapes intact', async () => {
    const before = scene.parts[0].shape.boundingBox();
    await exportSceneGlbInstancedAsync(scene, { format: 'glb' });
    expect(scene.parts[0].shape.boundingBox()).toEqual(before);
  }, 60_000);

  it('keeps per-part colors when parts share a geometry key', async () => {
    await initOcct();
    const code = `const a = assembly('c'); a.part('r', box(5,5,5).color('#ff0000'), { at: [0,0,0] }); a.part('b', box(5,5,5).color('#0000ff'), { at: [20,0,0] }); return a.model();`;
    const m = await buildModel({ code, fileName: 'c.kcad.ts' });
    if (!isSceneBackend(m.rootShape)) throw new Error('expected a scene');
    expect(canExportInstanced(m.rootShape)).toBe(true);
    const doc = await new NodeIO().readBinary(await exportSceneGlbInstancedAsync(m.rootShape, { format: 'glb' }));
    const col = (n: string) => doc.getRoot().listNodes().find((x) => x.getName() === n)!.getMesh()!.listPrimitives()[0].getMaterial()!.getBaseColorFactor();
    expect(col('r')[0]).toBeGreaterThan(0.9);
    expect(col('b')[2]).toBeGreaterThan(0.9);
  }, 60_000);
});
