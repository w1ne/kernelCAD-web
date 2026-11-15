// SPDX-License-Identifier: MIT
// A CC0 scene prop only. Verify geometric identity, not load capacity or tolerances.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type V = [number,number,number];
type Tri = [V,V,V];
const root = resolve(import.meta.dirname, '../../..');
const path = 'catalog/kits/standard-components/cable-clamp.kcad.ts';
const code = readFileSync(resolve(root,path),'utf8');
const sub = (a:V,b:V):V => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot = (a:V,b:V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a:V,b:V):V => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function rayHit(tris:Tri[],p:V,d:V):boolean {
  return tris.some(([a,b,c])=>{
    const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
    if(Math.abs(det)<1e-9) return false;
    const f=1/det,q=sub(p,a),u=f*dot(q,h),r=cross(q,e1),v=f*dot(d,r),t=f*dot(e2,r);
    return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7&&t>1e-6&&t<100;
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
async function variant(src:string) {
  const exp=await runAndExport({code:src,fileName:'cable-clamp.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:420}}});
  expect(exp.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  return triangles(exp.bytes);
}
function accept(parts:Map<string,Tri[]>,s:number) {
  expect([...parts.keys()].sort()).toEqual(['connected-steel-frame','separate-rubber-liner']);
  const steel=parts.get('connected-steel-frame')!,liner=parts.get('separate-rubber-liner')!;
  expect(steel.length).toBeGreaterThan(100);
  expect(liner.length).toBeGreaterThan(15);
  // Authored Z -> GLB Y; authored Y -> GLB -Z. Check *native exported triangles*.
  for(const x of [-18,18]) {
    expect(rayHit(steel,[x*s,-2*s,0],[0,1,0]),'mounting hole must cross all steel').toBe(false);
  }
  expect(rayHit(steel,[14*s,-2*s,0],[0,1,0]),'surrounding plate must remain solid').toBe(true);
  expect(rayHit(steel,[0,15*s,-20*s],[0,0,1]),'cable through-passage must be unobstructed').toBe(false);
  expect(rayHit(liner,[0,15*s,-20*s],[0,0,1]),'liner must not plug cable').toBe(false);
  expect(rayHit(steel,[0,20*s,-20*s],[0,0,1]),'upper load path needs a steel arch').toBe(true);
  expect(rayHit(liner,[0,18.5*s,-20*s],[0,0,1]),'liner must be a distinct inner shell').toBe(true);
}
beforeAll(async()=>{await initOcct();},30000);
describe('cable clamp CC0 structural fidelity',()=>{
  it('has two real mounting bores, connected frame, separate liner and clear cable bore',async()=>{
    const {asset,glb}=await buildCatalogAssetWithGlb(root,path);
    expect(asset.description).toMatch(/illustrative CC0 low-poly/i);
    expect(asset.description).toMatch(/not a load-rated/i);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM.map(n=>Math.round(1000*n)).sort((a,b)=>a-b)).toEqual([48,34,22].sort((a,b)=>a-b));
    accept(await triangles(glb),1);
  },30000);
  it('rejects a plate that covers the two mounting holes',async()=>{
    const broken=code.replace('frame = frame.subtract(hole);','');
    expect(broken).not.toBe(code);
    const steel=(await variant(broken)).get('connected-steel-frame')!;
    expect(rayHit(steel,[18,-2,0],[0,1,0])).toBe(true);
  },30000);
  it('rejects a closed solid arch that plugs the cable path',async()=>{
    const broken=code.replace('.subtract(cylinder(21*s, 8.5*s, 32).translate(0, 0, -s))','');
    expect(broken).not.toBe(code);
    const steel=(await variant(broken)).get('connected-steel-frame')!;
    expect(rayHit(steel,[0,15,-20],[0,0,1])).toBe(true);
  },30000);
  it('preserves mount, steel arch and liner across compact and large variants',async()=>{
    for(const [name,s] of [['compact',.75],['large',1.25]] as const)
      accept(await variant(code.replace("param('size', 'standard'",`param('size', '${name}'`)),s);
  },60000);
});
