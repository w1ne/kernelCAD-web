// SPDX-License-Identifier: MIT
// A low-poly sanitary lobe pump still needs the cover fastener pattern that
// its source claims. Inspect GLB geometry, not merely the source text or PNG.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const root = resolve(import.meta.dirname, '../../..');
const file = resolve(root, 'catalog/kits/beverage-bottling-line/sanitary-lobe-pump.kcad.ts');

type Node = { name?: string; mesh?: number };
type Gltf = {
  nodes: Node[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
};
function positions(glb: Uint8Array | Buffer): Map<string, { min: number[]; max: number[] }> {
  const b = Buffer.from(glb);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as Gltf;
  const map = new Map<string, { min: number[]; max: number[] }>();
  for (const node of json.nodes) {
    if (!node.name || node.mesh === undefined) continue;
    const positionAccessor = json.accessors[json.meshes[node.mesh]!.primitives[0]!.attributes.POSITION]!;
    if (positionAccessor.min && positionAccessor.max) map.set(node.name, { min: positionAccessor.min, max: positionAccessor.max });
  }
  return map;
}
function assertCoverFasteners(glb: Uint8Array | Buffer, coords: [number, number][]) {
  const parts = positions(glb);
  expect(parts.has('front-cover')).toBe(true);
  const cover = parts.get('front-cover')!;
  expect(cover.min[0]).toBeCloseTo(-365, 3);
  expect(cover.max[0]).toBeCloseTo(-330, 3);
  const capNames = [...parts.keys()].filter(name => /^cap-nut-\d+$/.test(name));
  expect(capNames).toEqual(['cap-nut-0', 'cap-nut-1', 'cap-nut-2', 'cap-nut-3']);
  for (const [i, [y, z]] of coords.entries()) {
    const nut = parts.get(`cap-nut-${i}`)!;
    expect(nut.max[0]).toBeCloseTo(cover.min[0], 3);
    expect(nut.min[0]).toBeLessThan(cover.min[0]);
    expect((nut.min[1] + nut.max[1]) / 2).toBeCloseTo(y, 3);
    expect((nut.min[2] + nut.max[2]) / 2).toBeCloseTo(z, 3);
  }
}

beforeAll(async () => { await initOcct(); });

describe('sanitary rotary-lobe pump scene prop', () => {
  it('has four actual cap-nut bodies on the visible removable cover', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, 'catalog/kits/beverage-bottling-line/sanitary-lobe-pump.kcad.ts');
    expect(asset.category).toBe('prop');
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    assertCoverFasteners(glb, [[-65, 250], [65, 250], [-65, 470], [65, 470]]);
  }, 30000);

  it('keeps all four fasteners on the cover when port orientation changes', async () => {
    const source = readFileSync(file, 'utf8');
    const code = source.replace("param('ports', 'horizontal'", "param('ports', 'vertical'");
    expect(code).not.toBe(source);
    const exported = await runAndExport({
      code, fileName: 'sanitary-lobe-pump.kcad.ts', scriptDir: resolve(file, '..'),
      format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2000 } },
    });
    expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    assertCoverFasteners(exported.bytes, [[-110, 335], [-110, 465], [110, 335], [110, 465]]);
  }, 30000);
});
