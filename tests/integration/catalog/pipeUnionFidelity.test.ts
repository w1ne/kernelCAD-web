// SPDX-License-Identifier: MIT
// A union needs detachable tailpieces and a nut with a real continuous bore.
// Verify the exported BREP-derived GLB, not its title, knobs or PNG metadata.
import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';

const root = resolve(import.meta.dirname, '../../..');
const file = resolve(root, 'catalog/kits/standard-components/pipe-union.kcad.ts');

type Gltf = {
  nodes: Array<{ name?: string; mesh?: number }>;
  meshes: Array<{ primitives: Array<{ attributes: { POSITION: number } }> }>;
  accessors: Array<{ min?: number[]; max?: number[] }>;
};
function bounds(glb: Uint8Array | Buffer) {
  const b = Buffer.from(glb);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const gltf = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as Gltf;
  const out = new Map<string, { min: number[]; max: number[] }>();
  for (const n of gltf.nodes) {
    if (!n.name || n.mesh === undefined) continue;
    const a = gltf.accessors[gltf.meshes[n.mesh]!.primitives[0]!.attributes.POSITION]!;
    if (a.min && a.max) out.set(n.name, { min: a.min, max: a.max });
  }
  return out;
}
// Test the actual open bore by casting an upward ray onto the triangles.
function verticalHit(tris: SoftTriangle[], px: number, pz: number) {
  for (const triangle of tris) {
    const [[ax,az], [bx,bz], [cx,cz]] = triangle.v.map(v => [v[0], v[2]]);
    const d = (bz-cz)*(ax-cx) + (cx-bx)*(az-cz);
    if (Math.abs(d) < 1e-12) continue;
    const a = ((bz-cz)*(px-cx) + (cx-bx)*(pz-cz))/d;
    const b = ((cz-az)*(px-cx) + (ax-cx)*(pz-cz))/d;
    if (a >= -1e-6 && b >= -1e-6 && 1-a-b >= -1e-6) return true;
  }
  return false;
}
function verify(glb: Uint8Array | Buffer, size: number, tris: SoftTriangle[]) {
  const parts = bounds(glb);
  expect([...parts.keys()].sort()).toEqual([
    'coupling-hex-nut','face-gasket','inlet-tailpiece','outlet-tailpiece',
  ]);
  const get = (name: string) => parts.get(name)!;
  const range = (name: string, axis: number, lo: number, hi: number) => {
    expect(get(name).min[axis], name).toBeCloseTo(lo*size, 2);
    expect(get(name).max[axis], name).toBeCloseTo(hi*size, 2);
  };
  // Opposite tailpieces do not overlap axially; a 1 mm gasket separates them.
  range('inlet-tailpiece',2,0,22.5);
  range('face-gasket',2,22.5,23.5);
  range('outlet-tailpiece',2,23.5,49);
  range('coupling-hex-nut',2,15,33);
  // Six-sided central nut, not the original square block.
  range('coupling-hex-nut',0,-22*Math.sqrt(3)/2,22*Math.sqrt(3)/2);
  range('coupling-hex-nut',1,-22,22);
  expect(verticalHit(tris,0,0)).toBe(false); // through bore remains unobstructed
  expect(verticalHit(tris,0.011*size,0)).toBe(true); // solid annular wall exists
}

beforeAll(async () => { await initOcct(); });
describe('CC0 pipe union scene identity and geometry', () => {
  it('has four actual separate bodies, open bore and a six-sided coupling nut', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, 'catalog/kits/standard-components/pipe-union.kcad.ts');
    expect(asset.category).toBe('attachment');
    expect(asset.description).toMatch(/illustrative CC0 low-poly/i);
    expect(asset.description).toMatch(/not verified manufacturing details/i);
    expect(asset.stats.minUpM).toBeCloseTo(0,6);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    const triangles = await glbTriangles(glb);
    expect(triangles.length).toBeGreaterThan(500);
    verify(glb,1,triangles);
  }, 30000);
  it('retains distinct interfaces for both size limits', async () => {
    const source = readFileSync(file,'utf8');
    for (const [name, scale] of [['compact',0.75],['large',1.25]] as const) {
      const code = source.replace("param('size', 'standard'",`param('size', '${name}'`);
      expect(code).not.toBe(source);
      const result=await runAndExport({code,fileName:'pipe-union.kcad.ts',scriptDir:resolve(file,'..'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:800}}});
      expect(result.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(result.bytes,scale,await glbTriangles(result.bytes));
    }
  },30000);
});
