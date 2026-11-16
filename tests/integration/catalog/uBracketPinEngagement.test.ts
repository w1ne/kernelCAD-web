// SPDX-License-Identifier: MIT
// CC0 geometry identity only. Does not assert load capacity or tolerances.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
const root=resolve(import.meta.dirname,'../../..');
const file='catalog/kits/standard-components/u-bracket.kcad.ts';
const source=readFileSync(resolve(root,file),'utf8');
type V=[number,number,number];type T=[V,V,V];
async function triangles(glb:Uint8Array) {
 const doc=await new NodeIO().readBinary(glb),out=new Map<string,T[]>();
 for(const n of doc.getRoot().listNodes()) {
  if(!n.getMesh())continue;const m=n.getWorldMatrix(),t:T[]=[];
  for(const p of n.getMesh()!.listPrimitives()) {
   const pos=p.getAttribute('POSITION')!,ix=p.getIndices();
   for(let i=0;i<(ix?.getCount()??pos.getCount());i+=3)
    t.push([0,1,2].map(j=>{
     const v=pos.getElement(ix?ix.getScalar(i+j):i+j,[]);
     return [0,1,2].map(k=>1000*(m[k]!*v[0]!+m[k+4]!*v[1]!+m[k+8]!*v[2]!+m[k+12]!)) as V;
    }) as T);
  }
  out.set(n.getName(),t);
 }
 return out;
}
const xlim=(t:T[]):[number,number]=>{
 const v=t.flatMap(a=>a.map(p=>p[0]));return [Math.min(...v),Math.max(...v)];
};
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function hit(tris:T[],p:V,d:V) {
 return tris.some(([a,b,c])=>{
  const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
  if(Math.abs(det)<1e-9)return false;
  const f=1/det,q=sub(p,a),u=f*dot(q,h),r=cross(q,e1),v=f*dot(d,r),t=f*dot(e2,r);
  return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7&&t>1e-6&&t<120;
 });
}
function accept(p:Map<string,T[]>,s:number){
 expect([...p.keys()].sort()).toEqual(['back','cross-pin','left-ear','right-ear']);
 const [lo,hi]=xlim(p.get('cross-pin')!);
 expect(lo).toBeCloseTo(-28*s,1);expect(hi).toBeCloseTo(28*s,1);
 for(const [name,x] of [['left-ear',-25.5],['right-ear',25.5]] as const){
  const ear=p.get(name)!;const [a,b]=xlim(ear);
  expect(lo).toBeLessThanOrEqual(a);expect(hi).toBeGreaterThanOrEqual(b);
  // Authored Z becomes GLB Y. The through-hole is open along X.
  expect(hit(ear,[(x-7)*s,19*s,0],[1,0,0])).toBe(false);
  expect(hit(ear,[(x-7)*s,28*s,0],[1,0,0])).toBe(true);
 }
}
async function variant(code:string){
 const e=await runAndExport({code,fileName:'u-bracket.kcad.ts',
  scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
  options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:320}}});
 expect(e.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
 return triangles(e.bytes);
}
beforeAll(async()=>{await initOcct();},30000);
describe('U-bracket pin and real bores',()=>{
 it('has an X-axis GLB pin engaging both perforated ears',async()=>{
  const {asset,glb}=await buildCatalogAssetWithGlb(root,file);
  expect(asset.description).toMatch(/not manufacturer CAD or load-rated/i);
  expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  accept(await triangles(glb),1);
 },30000);
 it('rejects the original wrong X-axis placement of the pin',async()=>{
  const old=source.replace('cylinder(56*s,4*s,16)\n  .rotateY(90).translate(-28*s,0,19*s)',
   'cylinder(40*s,4*s,10).rotateX(90).translate(0,20*s,19*s)');
  expect(old).not.toBe(source);
  const p=await variant(old),[a,b]=xlim(p.get('cross-pin')!);
  expect(a).toBeGreaterThan(-5);expect(b).toBeLessThan(5);
  expect(b).toBeLessThan(xlim(p.get('right-ear')!)[0]);
 },30000);
 it('preserves open bores and pin overlap across size extremes',async()=>{
  for(const [size,s] of [['compact',.75],['large',1.25]] as const)
   accept(await variant(source.replace("param('size', 'standard'","param('size', '"+size+"'")),s);
 },60000);
});
