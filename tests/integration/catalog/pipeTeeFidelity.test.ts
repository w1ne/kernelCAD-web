// SPDX-License-Identifier: MIT
// A tee has THREE ports. Export success is not enough: the previous proposed
// repair used two full crossing pipes, giving four open ports under this title.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, type SoftTriangle } from '../../../scripts/lib/glbSoftwareRender';
const root = resolve(import.meta.dirname, '../../..');
const file = resolve(root, 'catalog/kits/standard-components/pipe-tee.kcad.ts');
type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot = (a: V,b: V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: V,b: V): V => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function intersects(tris: SoftTriangle[], start: V, dir: V): boolean {
  return tris.some(({v})=>{
    const e1=sub(v[1],v[0]), e2=sub(v[2],v[0]);
    const p=cross(dir,e2),det=dot(e1,p);
    if(Math.abs(det)<1e-12) return false;
    const t=sub(start,v[0]),u=dot(t,p)/det,q=cross(t,e1),b=dot(dir,q)/det;
    const distance=dot(e2,q)/det;
    return u>=-1e-7 && b>=-1e-7 && u+b<=1+1e-7 && distance>1e-7 && distance<0.1;
  });
}
function verify(tris: SoftTriangle[],scale: number) {
  // GLB world axes: source X, source Z, -source Y, in metres.
  // Test three different rays inside the common nominal 16 mm flow bore.
  for(const x of [-0.002,0,0.002]) {
    const junction: V=[x*scale,0.022*scale,0];
    expect(intersects(tris,junction,[0,1,0]),'upper run port blocked').toBe(false);
    expect(intersects(tris,junction,[0,-1,0]),'lower run port blocked').toBe(false);
    expect(intersects(tris,junction,[0,0,1]),'side branch blocked').toBe(false);
    expect(intersects(tris,junction,[0,0,-1]),'fourth port exists: this is a cross, not a tee').toBe(true);
  }
  const vertices=tris.flatMap(t=>t.v);
  expect(Math.max(...vertices.map(p=>p[2]))).toBeCloseTo(0.019*scale,5);
  expect(Math.min(...vertices.map(p=>p[2]))).toBeCloseTo(-0.012*scale,5);
  expect(Math.min(...vertices.map(p=>p[1]))).toBeCloseTo(0,6);
}
beforeAll(async()=>{await initOcct();},30000);
describe('pipe tee has three connected flow ports, not four',()=>{
  it('has two run ports, one side port and a closed back wall in actual exported geometry',async()=>{
    const {asset,glb}=await buildCatalogAssetWithGlb(root,'catalog/kits/standard-components/pipe-tee.kcad.ts');
    expect(asset.license).toBe('CC0-1.0');
    expect(asset.description).toMatch(/illustrative/i);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    verify(await glbTriangles(glb),1);
  },30000);
  it('preserves all three openings and closed fourth side at both size limits',async()=>{
    const source=readFileSync(file,'utf8');
    for(const [size,scale] of [['compact',0.75],['large',1.25]] as const){
      const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
      expect(code).not.toBe(source);
      const result=await runAndExport({code,fileName:'pipe-tee.kcad.ts',scriptDir:resolve(file,'..'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:520}}});
      expect(result.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(await glbTriangles(result.bytes),scale);
    }
  },30000);
});
