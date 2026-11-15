// SPDX-License-Identifier: MIT
// Illustrative TH35 low-poly clip identity; explicitly NOT a certified fit test.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';
type V=[number,number,number]; type Tri=[V,V,V];
const root=resolve(import.meta.dirname,'../../..');
const file='catalog/kits/standard-components/din-rail-end-stop.kcad.ts';
const source=readFileSync(resolve(root,file),'utf8');
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
async function variant(code:string) {
 const exp=await runAndExport({code,fileName:'din-rail-end-stop.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:500}}});
 expect(exp.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
 return triangles(exp.bytes);
}
const clipName='under-lip-clip-and-stop-face';
const screwName='separate-slotted-clamping-screw';
// GLB coordinates map source (X,Y,Z) to (X,Z,-Y), all millimetres below.
const point=(x:number,y:number,z:number,s=1):V=>[x*s,(z+1.4)*s,-y*s];
function checkCrossSection(t:Tri[],s:number) {
 for(const y of [-16.5,16.5])
  expect(rayHit(t,point(-30,y,-.8,s),[1,0,0]),`under-lip retaining hook Y=${y}`).toBe(true);
 expect(rayHit(t,point(-30,0,-.8,s),[1,0,0]),'rail corridor below crown stays open').toBe(false);
 for(const y of [-20,20])
  expect(rayHit(t,point(-30,y,4,s),[1,0,0]),`sidewalls outside rail lip Y=${y}`).toBe(true);
 expect(rayHit(t,point(-30,0,4,s),[1,0,0]),'open central rail crown envelope').toBe(false);
 expect(rayHit(t,point(0,0,22,s),[1,0,0]),'stop face normal to X rail axis').toBe(true);
}
beforeAll(async()=>{await initOcct();},30000);
describe('illustrative TH35 DIN rail end stop geometry',()=>{
 it('committed gallery preview matches actual evaluated source render',async()=>{
  const {asset,glb}=await buildCatalogAssetWithGlb(root,file);
  const rendered=await renderTrianglesPng(await glbTriangles(glb),{label:`${asset.title} · ${asset.stats.triangles} tris`});
  const published=readFileSync(resolve(root,'catalog/kits/standard-components/previews/din-rail-end-stop.png'));
  expect(Buffer.compare(rendered,published),'thumbnail must reflect edited physical geometry, not an old marketing silhouette').toBe(0);
 },30000);
 it('has under-lip geometry, actual open channel, transverse stop and separate slotted screw',async()=>{
  const {asset,glb}=await buildCatalogAssetWithGlb(root,file);
  expect(asset.title).toMatch(/illustrative/i);
  expect(asset.description).toMatch(/not a verified clip design/i);
  expect(asset.stats.triangles).toBeGreaterThan(200);
  expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  expect(asset.stats.minUpM).toBeCloseTo(0,6);
  expect(asset.stats.sizeM.map(n=>Math.round(n*10000)/10).sort((a,b)=>a-b)).toEqual([25,31.4,41.6]);
  const parts=await triangles(glb);
  expect([...parts.keys()].sort()).toEqual([clipName,screwName].sort());
  checkCrossSection(parts.get(clipName)!,1);
  expect(parts.get(screwName)!.length).toBeGreaterThan(100);
 },30000);
 it('rejects a solid foot presented as a clip',async()=>{
  const broken=source.replace('housing = housing.union(block(-12,15.3,-1.4,24,5.5,1.1));', 'housing = housing.union(block(-12,-20.8,-1.4,24,41.6,1.1));');
  expect(broken).not.toEqual(source);
  const t=(await variant(broken)).get(clipName)!;
  expect(rayHit(t,point(-30,0,-.8),[1,0,0])).toBe(true);
 },30000);
 it('rejects missing opposite retaining hooks',async()=>{
  const broken=source.replace('housing = housing.union(block(-12,15.3,-1.4,24,5.5,1.1));', '// hook intentionally deleted');
  expect(broken).not.toEqual(source);
  const t=(await variant(broken)).get(clipName)!;
  expect(rayHit(t,point(-30,16.5,-.8),[1,0,0])).toBe(false);
 },30000);
 it('preserves rail envelope features across both scale presets',async()=>{
  for(const [scale,s] of [['compact',.75],['large',1.25]] as const) {
   const t=(await variant(source.replace("param('size', 'standard'",`param('size', '${scale}'`))).get(clipName)!;
   checkCrossSection(t,s);
  }
 },60000);
});
