// SPDX-License-Identifier: MIT
// Single-bored fire hose barrel plus independent selector and pistol grip.
// A visually acceptable but solid, disconnected barrel must fail.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles,renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

type V = [number, number, number];
type Tri = [V, V, V];
const root = resolve(import.meta.dirname, '../../..');
const sourcePath = 'catalog/kits/fire-rescue/fire-hose-nozzle.kcad.ts';
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
// The low-poly GLB POSITION accessor is authored Z-up; node world transform converts for the renderer.
function axialHit(tris:Tri[], y:number,z:number):boolean {
 return rayHits(tris,[-155,y,z],[1,0,0]);
}
function radialHit(tris:Tri[],x:number,z:number):boolean {
 return rayHits(tris,[x,0,z],[0,1,0]);
}
function verify(parts:Map<string,Tri[]>):void {
 expect([...parts.keys()].sort()).toEqual(['annular-static-selector-sleeve','one-piece-continuous-flow-body','separate-pistol-grip']);
 const body=parts.get('one-piece-continuous-flow-body')!,sleeve=parts.get('annular-static-selector-sleeve')!,grip=parts.get('separate-pistol-grip')!;
 expect(components(body),'metal body is physically one connected flow path').toBe(1);
 expect(components(sleeve),'selector sleeve is one hollow ring').toBe(1);
 expect(components(grip),'grip is separately manufactured/overmoulded').toBe(1);
 const vertex=body.flat();const min=[0,1,2].map(k=>Math.min(...vertex.map(v=>v[k]))),max=[0,1,2].map(k=>Math.max(...vertex.map(v=>v[k])));
 expect(min[0]).toBeCloseTo(-111.6,1);expect(max[0]).toBeCloseTo(155,1);
 expect(max[1]-min[1]).toBeCloseTo(90,1);
 for(const [y,z] of [[0,66],[8,66],[0,74]])expect(axialHit(body,y,z),'open through-passage across every segment').toBe(false);
 for(const y of [18,20])expect(axialHit(body,y,66),'connected annular wall exists outside Ø28 bore').toBe(true);
 for(const x of [-100,-20,50,130])expect(radialHit(body,x,66),`wall exists at x=${x} around continuous axial bore`).toBe(true);
 expect(axialHit(sleeve,0,66),'ring is genuinely hollow').toBe(false);
 expect(radialHit(sleeve,70,66),'selector sleeve has annular wall outside barrel').toBe(true);
 expect(axialHit(grip,0,10),'pistol grip exists below barrel').toBe(true);
}
beforeAll(async()=>{await initOcct();},30000);
describe('fire-hose nozzle illustrative continuous fluid passage',()=>{
 it('committed thumbnail is rendered from current CAD source with exact canonical caption',async()=>{
  const {asset,glb}=await buildCatalogAssetWithGlb(root,sourcePath);
  const render=await renderTrianglesPng(await glbTriangles(glb),{label:`${asset.title} · ${asset.stats.triangles} tris`});
  const preview=readFileSync(resolve(root,'catalog/kits/fire-rescue/previews/fire-hose-nozzle.png'));
  expect(Buffer.compare(render,preview)).toBe(0);
 },30000);
 for(const [size,scale] of [[1,1],[0.7,0.7],[1.3,1.3]] as const){
  it(`scale ${size} has connected bore, two supported accessory bodies`,async()=>{
   const source=readFileSync(resolve(root,sourcePath),'utf8');
   const built=await buildCatalogAssetWithGlb(root,sourcePath);
   const code=size===1?source:source.replace("param('scale', 1,",`param('scale', ${size},`);
   const exp=size===1?{bytes:built.glb,diagnostics:[]}:await runAndExport({code,fileName:'fire-hose-nozzle.kcad.ts',scriptDir:resolve(root,'catalog/kits/fire-rescue'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}}});
   expect(exp.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
   verify(await readMeshes(exp.bytes,scale));
   expect(built.asset.description).toMatch(/not pressure-rated or manufacturer-grade CAD/i);
   expect(built.asset.description).toMatch(/open axial bore from hose coupling to fixed front tip/i);
   expect(built.asset.description).toMatch(/no working selector valve/i);
   expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
   expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
  },60000);
 }
 it('original source is disconnected and contains solid blocked flow bodies',async()=>{
  const original=readFileSync(resolve(root,'docs/quality/evidence/fire-hose-nozzle-20261115/original-source.kcad.ts'),'utf8');
  const exp=await runAndExport({code:original,fileName:'original-fire-hose-nozzle.kcad.ts',scriptDir:resolve(root,'catalog/kits/fire-rescue'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:2200}}});
  expect(exp.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  const parts=await readMeshes(exp.bytes,1);
  expect([...parts.keys()].sort()).toEqual(['hose-tail','nozzle-body','pistol-grip','selector-collar','tip']);
  expect(axialHit(parts.get('nozzle-body')!,0,64),'original nozzle-body blocks fluid axis').toBe(true);
  expect(()=>verify(parts),'original must fail connected flow identity').toThrow();
 },60000);
});
