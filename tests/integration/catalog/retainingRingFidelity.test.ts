// SPDX-License-Identifier: MIT
// Count actual radial spokes and verify each joins the hub and rim.
// Three centered diametral bars are six spokes, not three.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type V = [number, number, number];
type Tri = [V, V, V];
const root = resolve(import.meta.dirname, '../../..');
const sourcePath = 'catalog/kits/standard-components/retaining-ring.kcad.ts';
const sub = (a: V, b: V): V => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a: V, b: V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: V, b: V): V => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function rayHits(tris: Tri[], start: V, direction: V): boolean {
  return tris.some(tri => {
    const edge1=sub(tri[1],tri[0]), edge2=sub(tri[2],tri[0]);
    const p=cross(direction,edge2), determinant=dot(edge1,p);
    if(Math.abs(determinant)<1e-9)return false;
    const t=sub(start,tri[0]), u=dot(t,p)/determinant, q=cross(t,edge1);
    const v=dot(direction,q)/determinant, distance=dot(edge2,q)/determinant;
    return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7&&distance>1e-6&&distance<200;
  });
}
async function readMeshes(glb: Uint8Array, scale: number): Promise<Map<string,Tri[]>> {
  // Low-poly positions are authored millimetres before scene-axis conversion.
  const doc=await new NodeIO().readBinary(glb), parts=new Map<string,Tri[]>();
  for(const node of doc.getRoot().listNodes()) {
    const mesh=node.getMesh(); if(!mesh)continue;
    const tris:Tri[]=[];
    for(const primitive of mesh.listPrimitives()) {
      const pos=primitive.getAttribute('POSITION')!, indices=primitive.getIndices();
      const count=indices?indices.getCount():pos.getCount();
      for(let i=0;i<count;i+=3)tris.push([0,1,2].map(k=>
        pos.getElement(indices?indices.getScalar(i+k):i+k,[]).map(v=>v/scale) as V
      ) as Tri);
    }
    parts.set(node.getName(),tris);
  }
  return parts;
}
function components(tris: Tri[]): number {
  const parent=new Map<string,string>();
  const find=(key:string):string=>{const p=parent.get(key)!;if(p===key)return key;const r=find(p);parent.set(key,r);return r;};
  for(const tri of tris) {
    const keys=tri.map(v=>v.map(x=>x.toFixed(4)).join(','));
    for(const key of keys)if(!parent.has(key))parent.set(key,key);
    for(const key of keys.slice(1))parent.set(find(key),find(keys[0]));
  }
  return new Set([...parent.keys()].map(find)).size;
}
function faceHit(tris:Tri[], x:number, y:number):boolean {
  return rayHits(tris,[x,y,-3],[0,0,1]);
}
function verify(parts:Map<string,Tri[]>) {
  expect([...parts.keys()]).toEqual(['retaining-ring-body']);
  const body=parts.get('retaining-ring-body')!;
  expect(components(body),'retaining ring and its plier ears are one connected spring body').toBe(1);
  // Both plier holes are actual voids through the full thickness.
  for(const x of [-6,6]) {
    expect(faceHit(body,x,20.5),`plier bore at X=${x}`).toBe(false);
    for(const dx of [-2.1,2.1])expect(faceHit(body,x+dx,20.5),`material around plier bore at X=${x+dx}`).toBe(true);
    expect(faceHit(body,x,23),`solid ear shoulder at X=${x}`).toBe(true);
  }
  // Open slit, intact back band and central shaft aperture.
  expect(faceHit(body,0,19),'gap between ears remains open').toBe(false);
  expect(faceHit(body,0,-18),'retaining arc remains solid').toBe(true);
  expect(faceHit(body,0,0),'central shaft opening remains clear').toBe(false);
  const bb=body.flat();const xs=bb.map(v=>v[0]),ys=bb.map(v=>v[1]),zs=bb.map(v=>v[2]);
  expect(Math.max(...xs)-Math.min(...xs),'ring width').toBeGreaterThan(39);
  expect(Math.max(...ys)-Math.min(...ys),'ring length incl ears').toBeGreaterThan(43);
  expect(Math.min(...zs)).toBeCloseTo(0,4);
  expect(Math.max(...zs)).toBeCloseTo(3,4);
}
beforeAll(async()=>{await initOcct();},30000);
describe('retaining-ring integral ears and actual plier holes',()=>{
 for(const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const) {
  it(`${size}: one continuous ring, both plier holes through, clear gap`,async()=>{
   const source=readFileSync(resolve(root,sourcePath),'utf8');
   const built=await buildCatalogAssetWithGlb(root,sourcePath);
   const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
   const exported=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
    code,fileName:'retaining-ring.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
    options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}}
   });
   expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
   verify(await readMeshes(exported.bytes,scale));
   expect(built.asset.description).toMatch(/one connected spring body/i);
   expect(built.asset.description).toMatch(/two integral plier ears with real through-holes/i);
   expect(built.asset.description).toMatch(/not manufacturer-grade CAD/i);
   expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
   expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
  },60000);
 }
 it('negative control: original ring exports but has detached, undrilled ears',async()=>{
  const source=readFileSync(resolve(root,'docs/quality/evidence/retaining-ring-20261113/original-source.kcad.ts'),'utf8');
  const exported=await runAndExport({code:source,fileName:'original-ring.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:300}}});
  expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  const parts=await readMeshes(exported.bytes,1);
  expect(parts.size).toBe(3);
  expect(faceHit([...parts.values()].flat(),-6,20.5)).toBe(true);
  expect(faceHit([...parts.values()].flat(),6,20.5)).toBe(true);
  expect(()=>verify(parts)).toThrow();
 },60000);
});
