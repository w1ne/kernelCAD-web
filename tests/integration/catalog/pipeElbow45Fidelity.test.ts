// SPDX-License-Identifier: MIT
// A rendered PNG and a triangle budget do not prove that a pipe elbow is hollow.
import { beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { glbTriangles } from '../../../scripts/lib/glbSoftwareRender';

type Vec3 = [number, number, number];
const minus = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a: Vec3, b: Vec3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: Vec3, b: Vec3): Vec3 =>
  [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function rayIntersections(tris: { v: Vec3[] }[], from: Vec3, to: Vec3): number {
  const ray = minus(to, from);
  const hits: number[] = [];
  for (const {v: [a,b,c]} of tris) {
    if (!a || !b || !c) continue;
    const e1=minus(b,a),e2=minus(c,a),p=cross(ray,e2),det=dot(e1,p);
    if (Math.abs(det) < 1e-12) continue;
    const inv=1/det,tvec=minus(from,a),u=dot(tvec,p)*inv;
    if (u < -1e-7 || u > 1+1e-7) continue;
    const q=cross(tvec,e1),v=dot(ray,q)*inv;
    if (v < -1e-7 || u+v > 1+1e-7) continue;
    const t=dot(e2,q)*inv;
    if (t > 1e-5 && t < 1-1e-5) hits.push(t);
  }
  return hits.sort((a,b)=>a-b).filter((t,i,a)=>i===0||Math.abs(t-a[i-1]!)>1e-4).length;
}

describe('CC0 45-degree elbow geometry (illustrative, not pressure-rated)', () => {
  beforeAll(async () => { await initOcct(); });
  it('has a continuous hollow centerline, actual annular walls and open terminal ports', async () => {
    const {asset,glb}=await buildCatalogAssetWithGlb(resolve(import.meta.dirname,'../../..'),
      'catalog/kits/standard-components/pipe-elbow-45.kcad.ts');
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.description).toMatch(/not specified pressure fittings/i);
    // Export is in meters with Y up. The original solid center cap fails both
    // the outlet centerline and the outlet wall checks.
    const triangles=await glbTriangles(glb);
    expect(rayIntersections(triangles,[0,-0.001,0],[0,0.019,0])).toBe(0);
    expect(rayIntersections(triangles,[0,0.020,0],[0.0205,0.0405,0])).toBe(0);
    expect(rayIntersections(triangles,[0,0.004,0],[0.016,0.004,0])).toBeGreaterThan(0);
    expect(rayIntersections(triangles,[0.014,0.034,0],[0.028,0.034,0])).toBeGreaterThan(0);
    expect(asset.stats.sizeM[0]).toBeGreaterThan(0.04);
    expect(asset.stats.sizeM[1]).toBeGreaterThan(0.045);
  }, 90000);
});
