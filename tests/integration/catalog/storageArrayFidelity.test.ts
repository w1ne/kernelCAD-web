// SPDX-License-Identifier: MIT
// The live storage array previously copied the compute chassis mesh exactly.
// Verify functional storage-specific geometry in the exported GLB, not only PNGs.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const file = resolve(root, 'catalog/kits/data-center-infrastructure/storage-array-chassis.kcad.ts');

type Gltf = {
  nodes: { name?: string; mesh?: number }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
};
function namedBounds(glb: Uint8Array | Buffer): Map<string, { min: number[]; max: number[] }> {
  const b = Buffer.from(glb);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const data = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as Gltf;
  const out = new Map<string, { min: number[]; max: number[] }>();
  for (const node of data.nodes) {
    if (!node.name || node.mesh === undefined) continue;
    const accessor = data.accessors[data.meshes[node.mesh]!.primitives[0]!.attributes.POSITION]!;
    if (accessor.min && accessor.max) out.set(node.name, { min: accessor.min, max: accessor.max });
  }
  return out;
}
function assert24BayArray(glb: Uint8Array | Buffer, scale = 1) {
  const parts = namedBounds(glb);
  const carriers = [...parts.keys()].filter(k => /^drive-carrier-\d-\d$/.test(k));
  const grips = [...parts.keys()].filter(k => /^drive-grip-\d-\d$/.test(k));
  expect(carriers).toHaveLength(24);
  expect(grips).toHaveLength(24);
  for (const name of ['front-panel', 'chassis-shell', 'rack-ear-left', 'rack-ear-right',
    'handle-left', 'handle-right', 'rear-controller-left', 'rear-controller-right',
    'rear-power-module-left', 'rear-power-module-right']) expect(parts.has(name), name).toBe(true);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
    const carrier = parts.get(`drive-carrier-${row}-${col}`)!;
    const center = carrier.min.map((v, i) => (v + carrier.max[i]!) / 2);
    expect(center[0]).toBeCloseTo((-170 + 68 * col) * scale, 3);
    expect(center[1]).toBeCloseTo(-373 * scale, 3);
    expect(center[2]).toBeCloseTo((18 + 38 * row + 15.5) * scale, 3);
  }
  const shell = parts.get('chassis-shell')!;
  expect(shell.min[2]).toBeCloseTo(0, 3);
  expect(shell.max[2]).toBeCloseTo(176 * scale, 3);
}

beforeAll(async () => { await initOcct(); });

describe('storage-array catalogue scene prop', () => {
  it('is visibly distinct from the 8-bay compute chassis and includes 24 front carriers', async () => {
    const storage = await buildCatalogAssetWithGlb(root, 'catalog/kits/data-center-infrastructure/storage-array-chassis.kcad.ts');
    const server = await buildCatalogAssetWithGlb(root, 'catalog/kits/data-center-infrastructure/high-density-server-chassis.kcad.ts');
    expect(storage.asset.category).toBe('prop');
    expect(storage.asset.description).toMatch(/not a vendor manufacturing model/i);
    expect(storage.asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(storage.asset.stats.triangles).toBeLessThanOrEqual(storage.asset.triangleBudget);
    assert24BayArray(storage.glb);
    expect([...namedBounds(server.glb).keys()].filter(k => /^drive-carrier-\d+$/.test(k))).toHaveLength(8);
    expect((await glbTriangles(storage.glb)).length).not.toBe((await glbTriangles(server.glb)).length);
  }, 30000);

  it('keeps the drive and service-module identities at both supported scale limits', async () => {
    const source = readFileSync(file, 'utf8');
    for (const scale of [0.7, 1.3]) {
      const code = source.replace("param('scale', 1", `param('scale', ${scale}`);
      expect(code).not.toBe(source);
      const exported = await runAndExport({
        code, fileName: 'storage-array-chassis.kcad.ts', scriptDir: resolve(file, '..'),
        format: 'glb', options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2200 } },
      });
      expect(exported.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      assert24BayArray(exported.bytes, scale);
    }
  }, 30000);
});
