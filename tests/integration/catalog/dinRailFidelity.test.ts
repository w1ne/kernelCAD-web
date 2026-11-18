// SPDX-License-Identifier: MIT
// Geometry identity of an illustrative CC0 DIN TH35 scene prop, not IEC certification.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type V=[number,number,number];
type Tri=[V,V,V];
const root=resolve(import.meta.dirname,'../../..');
const path='catalog/kits/standard-components/din-rail.kcad.ts';
const code=readFileSync(resolve(root,path),'utf8');
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function rayHit(tris:Tri[],p:V,d:V):boolean {
  return tris.some(([a,b,c])=>{
    const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
    if(Math.abs(det)<1e-9)return false;
    const f=1/det,q=sub(p,a),u=f*dot(q,h),r=cross(q,e1),v=f*dot(d,r),t=f*dot(e2,r);
    return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7&&t>1e-6&&t<150;
  });
}
async function triangles(bytes:Uint8Array):Promise<Map<string,Tri[]>> {
  const doc=await new NodeIO().readBinary(bytes),out=new Map<string,Tri[]>();
  for(const node of doc.getRoot().listNodes()) {
    const mesh=node.getMesh();if(!mesh)continue;
    const m=node.getWorldMatrix(),tris:Tri[]=[];
    for(const prim of mesh.listPrimitives()) {
      const pos=prim.getAttribute('POSITION')!,idx=prim.getIndices(),count=idx?idx.getCount():pos.getCount();
      for(let i=0;i<count;i+=3)tris.push([0,1,2].map(j=>{
        const v=pos.getElement(idx?idx.getScalar(i+j):i+j,[]);
        return [0,1,2].map(k=>1000*(m[k]!*v[0]!+m[k+4]!*v[1]!+m[k+8]!*v[2]!+m[k+12]!)) as V;
      }) as Tri);
    }
    out.set(node.getName(),tris);
  }
  return out;
}
async function variant(src:string):Promise<Tri[]> {
  const exp=await runAndExport({code:src,fileName:'din-rail.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:450}}});
  expect(exp.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  return (await triangles(exp.bytes)).get('connected-steel-top-hat-rail')!;
}
function accept(t:Tri[],s:number) {
  expect(t.length).toBeGreaterThan(150);
  // Native GLB maps source Z to GLB Y, source Y to GLB negative Z.
  for(const x of [-34,0,34])
    expect(rayHit(t,[x*s,-1*s,0],[0,1,0]),`mounting slot at X=${x} must be clear`).toBe(false);
  expect(rayHit(t,[17*s,-1*s,0],[0,1,0]),'steel crown between slots').toBe(true);
  for(const side of [-16,16])
    expect(rayHit(t,[20*s,-1*s,-side*s],[0,1,0]),'both retaining flanges exist').toBe(true);
  expect(rayHit(t,[20*s,3.5*s,-25*s],[0,0,1]),'skirts beneath raised crown').toBe(true);
  expect(rayHit(t,[-70*s,3*s,0],[1,0,0]),'open underside instead of solid bar').toBe(false);
}
beforeAll(async()=>{await initOcct();},30000);
describe('illustrative DIN TH35 rail geometric identity',()=>{
  it('has one connected top-hat section, 35 x 7.5 mm cross-section, 3 actual oblong slots',async()=>{
    const {asset,glb}=await buildCatalogAssetWithGlb(root,path);
    expect(asset.description).toMatch(/not a dimensionally certified IEC 60715 profile/i);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM.map(n=>Math.round(n*1000)).sort((a,b)=>a-b)).toEqual([8,35,110]);
    const parts=await triangles(glb);
    expect([...parts.keys()]).toEqual(['connected-steel-top-hat-rail']);
    accept(parts.get('connected-steel-top-hat-rail')!,1);
  },30000);
  it('detects solid rather than drilled crown',async()=>{
    const broken=code.replace('rail = rail.subtract(opening);','// no holes');
    expect(broken).not.toBe(code);
    const t=await variant(broken);
    expect(rayHit(t,[0,-1,0],[0,1,0])).toBe(true);
  },30000);
  it('detects underside filled by a solid bar',async()=>{
    const broken=code.replace('block(-55, -13, 5.9, 110, 26, 1.6)','block(-55, -13, 0, 110, 26, 7.5)');
    expect(broken).not.toBe(code);
    const t=await variant(broken);
    expect(rayHit(t,[-70,3,0],[1,0,0])).toBe(true);
  },30000);
  it('preserves slots and open hat profile at both size variants',async()=>{
    for(const [name,s] of [['compact',.75],['large',1.25]] as const)
      accept(await variant(code.replace("param('size', 'standard'",`param('size', '${name}'`)),s);
  },60000);
});
