// SPDX-License-Identifier: MIT
// Semantic native verification: a donut on a plate is not a two-piece pipe clamp.
// Test actual open horizontal passage and the separately removable cap.
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
const sourcePath = 'catalog/kits/standard-components/pipe-saddle-clamp.kcad.ts';
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
function verify(parts: Map<string,Tri[]>): void {
  expect([...parts.keys()].sort()).toEqual([
    'left-clamp-bolt','lower-rubber-liner','lower-saddle-and-foot',
    'removable-upper-cap','right-clamp-bolt','upper-rubber-liner'
  ]);
  const lower=parts.get('lower-saddle-and-foot')!, upper=parts.get('removable-upper-cap')!;
  expect(components(lower),'lower saddle and mounting foot one connected part').toBe(1);
  expect(components(upper),'upper cap and ears one connected removable part').toBe(1);
  for(const name of ['lower-rubber-liner','upper-rubber-liner','left-clamp-bolt','right-clamp-bolt']) {
    expect(components(parts.get(name)!),`${name} is a connected part`).toBe(1);
  }
  const all=[...parts.values()].flat();
  // Pipe axis is horizontal, along Y. Test both ends, several radial positions.
  for(const x of [-8,0,8]) for(const z of [14,19,24]) {
    if(Math.hypot(x,z-19)>11.4)continue;
    for(const dir of [-1,1] as const) {
      expect(rayHits(all,[x,dir*45,z],[0,-dir,0]),`clear horizontal bore x=${x},z=${z},side=${dir}`).toBe(false);
    }
  }
  // A deleted arch/seat could otherwise pass the clearance checks.
  for(const [x,z] of [[0,32],[0,6],[-14,19],[14,19]] as const) {
    expect(rayHits(all,[x,-45,z],[0,1,0]),`curved pipe saddle material x=${x},z=${z}`).toBe(true);
  }
  for(const [x,z] of [[0,32],[14,19]] as const) {
    expect(rayHits(upper,[x,-45,z],[0,1,0]),'upper curved cap retained').toBe(true);
  }
  for(const [x,z] of [[0,6],[-14,19]] as const) {
    expect(rayHits(lower,[x,-45,z],[0,1,0]),'lower seat retained').toBe(true);
  }
  // Mating ear bores must remain open in BOTH steel clamp halves (bolts are separate).
  for(const x of [-18,18]) {
    expect(rayHits(lower,[x,0,45],[0,0,-1]),`lower ear bore ${x}`).toBe(false);
    expect(rayHits(upper,[x,0,45],[0,0,-1]),`upper ear bore ${x}`).toBe(false);
    expect(rayHits(parts.get(x<0?'left-clamp-bolt':'right-clamp-bolt')!,[x,0,45],[0,0,-1]),'separate bolt present').toBe(true);
    expect(rayHits(lower,[x+(x<0?2.8:-2.8),0,45],[0,0,-1]),'flanking ear still has steel').toBe(true);
  }
  for(const x of [-26,26]) for(const y of [-14,14]) {
    expect(rayHits(lower,[x,y,45],[0,0,-1]),`mounting foot hole x=${x},y=${y}`).toBe(false);
  }
  for(const [axis,min,max] of [[0,-32,32],[1,-22,22]] as const) {
    const values=all.flat().map(p=>p[axis]);
    expect(Math.min(...values)).toBeCloseTo(min,2);
    expect(Math.max(...values)).toBeCloseTo(max,2);
  }
  const elevations=all.flat().map(p=>p[2]);
  expect(Math.min(...elevations)).toBeCloseTo(0,2);
  expect(Math.max(...elevations)).toBeGreaterThan(33);
  expect(Math.max(...elevations)).toBeLessThan(35);
}
beforeAll(async()=>{await initOcct()},30000);
describe('illustrative two-piece pipe saddle clamp functional fidelity',()=>{
 for(const [choice,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const){
  it(`${choice}: open horizontal pipe bore, separate cap/liners, four foot holes and real bolt passages`,async()=>{
   const source=readFileSync(resolve(root,sourcePath),'utf8');
   const built=await buildCatalogAssetWithGlb(root,sourcePath);
   const code=source.replace("param('size', 'standard'",`param('size', '${choice}'`);
   const exported=choice==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
    code,fileName:'pipe-saddle-clamp.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),
    format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}}
   });
   expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
   verify(await readMeshes(exported.bytes,scale));
   expect(built.asset.description).toMatch(/Illustrative CC0/i);
   expect(built.asset.description).toMatch(/Not manufacturer-grade CAD/i);
   expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
   expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
  },60000);
 }
 it('negative control: exact original vertical donut cannot satisfy a horizontal two-piece clamp',async()=>{
  const original=readFileSync(resolve(root,'tests/fixtures/catalog/pipeSaddleClampOriginal.kcad.ts'),'utf8');
  const exported=await runAndExport({code:original,fileName:'pipe-saddle-clamp-original.kcad.ts',
   scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
   options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:360}}});
  expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  const parts=await readMeshes(exported.bytes,1);
  expect([...parts.keys()]).toContain('seat');
  expect(parts.has('removable-upper-cap')).toBe(false);
  expect(()=>verify(parts)).toThrow();
 },60000);
});
