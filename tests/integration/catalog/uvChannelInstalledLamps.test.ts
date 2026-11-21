// SPDX-License-Identifier: MIT
// #1676: the UV channel promises two banks of eight lamp modules in the flow.
// Every installed module must carry real lamp bodies inside the water, not
// only the two modules lifted onto the service rack. Inspect GLB nodes.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const root = resolve(import.meta.dirname, '../../..');
const rel = 'catalog/kits/water-treatment/uv-disinfection-channel.kcad.ts';
const file = resolve(root, rel);

type Box = { min: number[]; max: number[] };
type Gltf = {
  nodes: { name?: string; mesh?: number }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
};
function boxes(glb: Uint8Array | Buffer): Map<string, Box> {
  const b = Buffer.from(glb);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as Gltf;
  const map = new Map<string, Box>();
  for (const node of json.nodes) {
    if (!node.name || node.mesh === undefined) continue;
    const a = json.accessors[json.meshes[node.mesh]!.primitives[0]!.attributes.POSITION]!;
    if (a.min && a.max) map.set(node.name, { min: a.min, max: a.max });
  }
  return map;
}
const inside = (inner: Box, outer: Box) =>
  [0, 1, 2].every(i => inner.min[i]! >= outer.min[i]! - 1e-6 && inner.max[i]! <= outer.max[i]! + 1e-6);

function assertInstalledLamps(glb: Uint8Array | Buffer) {
  const parts = boxes(glb);
  const water = parts.get('water-upstream');
  expect(water).toBeDefined();
  for (const b of [0, 1]) {
    for (let i = 0; i < 8; i++) {
      const tag = `bank-${b}-module-${i}`;
      const lamps = [...parts.keys()].filter(n => n.startsWith(`${tag}-lamp-`));
      expect(lamps, tag).toHaveLength(6);
      const legs = [...parts.entries()].filter(([n]) => n.startsWith(`${tag}-leg-`)).map(([, v]) => v);
      expect(legs, tag).toHaveLength(2);
      const legX = [Math.min(...legs.map(l => l.max[0]!)), Math.max(...legs.map(l => l.min[0]!))];
      for (const name of lamps) {
        const lamp = parts.get(name)!;
        // Submerged, and spanning the module between its two legs.
        expect(inside(lamp, water!), name).toBe(true);
        expect(lamp.min[0]!, name).toBeGreaterThanOrEqual(legX[0]!);
        expect(lamp.max[0]!, name).toBeLessThanOrEqual(legX[1]!);
        expect(lamp.max[0]! - lamp.min[0]!, name).toBeGreaterThan(0.9 * (legX[1]! - legX[0]!));
      }
    }
  }
  // The lifted modules keep their sleeves and wiper rings above the deck.
  for (const tag of ['lifted-module-a', 'lifted-module-b']) {
    expect([...parts.keys()].filter(n => n.startsWith(`${tag}-lamp-`)), tag).toHaveLength(6);
    expect([...parts.keys()].filter(n => n.startsWith(`${tag}-wiper-`)), tag).toHaveLength(7);
    expect(parts.get(`${tag}-lamp-0`)!.min[2]!).toBeGreaterThan(water!.max[2]!);
  }
}

beforeAll(async () => { await initOcct(); });

describe('UV disinfection channel (#1676)', () => {
  it('installs six lamps in each of the 16 in-flow modules within budget', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, rel);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    assertInstalledLamps(glb);
  }, 60000);

  it('keeps the installed lamps submerged at a different overall scale', async () => {
    const source = readFileSync(file, 'utf8');
    const code = source.replace("param('scale', 1,", "param('scale', 1.25,");
    expect(code).not.toBe(source);
    const exported = await runAndExport({
      code, fileName: 'uv-disinfection-channel.kcad.ts', scriptDir: resolve(file, '..'),
      format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 3600 } },
    });
    expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    assertInstalledLamps(exported.bytes);
  }, 60000);
});
