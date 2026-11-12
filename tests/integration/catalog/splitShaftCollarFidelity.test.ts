// SPDX-License-Identifier: MIT
// Source-level split-collar sketches can compile while omitting the actual
// clamping hardware. Prove named GLB bodies and real bore/notch surfaces.
import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const file = resolve(root, 'catalog/kits/standard-components/split-shaft-collar.kcad.ts');

type Gltf = {
  nodes: Array<{ name?: string; mesh?: number }>;
  meshes: Array<{ primitives: Array<{ attributes: { POSITION: number } }> }>;
  accessors: Array<{ min?: number[]; max?: number[] }>;
};
function nodes(glb: Uint8Array | Buffer) {
  const b = Buffer.from(glb);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const data = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as Gltf;
  const parts = new Map<string, { min: number[]; max: number[] }>();
  for (const n of data.nodes) {
    if (!n.name || n.mesh === undefined) continue;
    const accessor = data.accessors[data.meshes[n.mesh]!.primitives[0]!.attributes.POSITION]!;
    if (accessor.min && accessor.max) parts.set(n.name, { min: accessor.min, max: accessor.max });
  }
  return parts;
}
// A vertical ray in the GLB's metre-scaled Y-up software-render coordinates.
// Test occupied vs empty through-passages without relying on preview colors.
function hitVertical(tris: SoftTriangle[], px: number, pz: number) {
  for (const t of tris) {
    const [[a,c],[b,d],[e,f]] = t.v.map(v => [v[0], v[2]]);
    const det = (d-f)*(a-e)+(e-b)*(c-f);
    if (Math.abs(det) < 1e-11) continue;
    const w1 = ((d-f)*(px-e)+(e-b)*(pz-f))/det;
    const w2 = ((f-c)*(px-e)+(a-e)*(pz-f))/det;
    const w3 = 1-w1-w2;
    if (w1 >= -1e-6 && w2 >= -1e-6 && w3 >= -1e-6) return true;
  }
  return false;
}
function assertFunctionalSilhouette(glb: Uint8Array | Buffer, scale: number, tris: SoftTriangle[]) {
  const parts = nodes(glb);
  expect([...parts.keys()].sort()).toEqual(['clamp-screw', 'split-collar-body']);
  const screw = parts.get('clamp-screw')!;
  // A crosswise fastener bridges the split; not just a radial decorative boss.
  expect(screw.min[0]).toBeCloseTo(-12*scale, 3);
  expect(screw.max[0]).toBeCloseTo(17*scale, 3);
  expect((screw.min[1]+screw.max[1])/2).toBeCloseTo(-17*scale, 3);
  expect((screw.min[2]+screw.max[2])/2).toBeCloseTo(5*scale, 3);
  // No body in the 18 mm nominal shaft bore or in its radial relief slot.
  expect(hitVertical(tris, 0, 0)).toBe(false);
  expect(hitVertical(tris, 0, 0.011*scale)).toBe(false);
  // Solid material exists on the opposite rim and on the right wall.
  expect(hitVertical(tris, 0.015*scale, 0)).toBe(true);
  expect(hitVertical(tris, 0, -0.015*scale)).toBe(true);
}

beforeAll(async () => { await initOcct(); });
describe('CC0 split shaft collar visual fidelity', () => {
  it('has an open bore, split radial notch, two clamp lugs and a separate screw body', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, 'catalog/kits/standard-components/split-shaft-collar.kcad.ts');
    expect(asset.category).toBe('attachment');
    expect(asset.description).toMatch(/illustrative.*low-poly/i);
    expect(asset.description).toMatch(/not vendor manufacturing CAD/i);
    expect(asset.stats.minUpM).toBeCloseTo(0,6);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    const triangles = await glbTriangles(glb);
    expect(triangles.length).toBeGreaterThan(300); // The old 112-triangle prop omitted clamp parts.
    assertFunctionalSilhouette(glb, 1, triangles);
  }, 30000);
  it('retains the bore, split and screw over all size presets', async () => {
    const source = readFileSync(file, 'utf8');
    for (const [name, scale] of [['compact',0.75], ['large',1.25]] as const) {
      const code = source.replace("param('size', 'standard'", `param('size', '${name}'`);
      expect(code).not.toBe(source);
      const out = await runAndExport({code,fileName:'split-shaft-collar.kcad.ts',scriptDir:resolve(file,'..'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:400}}});
      expect(out.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      assertFunctionalSilhouette(out.bytes, scale, await glbTriangles(out.bytes));
    }
  }, 30000);
});
