// SPDX-License-Identifier: MIT
// V grooves must have sloped flanks, two distinct roots, and a continuously open bore.
// A stack of flat cylindrical steps can evaluate and still fail this engineering identity.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import sharp from 'sharp';
import { renderManufacturingCatalogPreview } from '../../../scripts/lib/manufacturingCatalogPreview';
import { pixelDiff, previewMatches } from '../../../scripts/lib/catalogPreviewGate';

type V = [number, number, number];
type Tri = [V, V, V];
const root = resolve(import.meta.dirname, '../../..');
const sourcePath = 'catalog/kits/standard-components/hose-barb-adapter.kcad.ts';
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
function outerAt(tris:Tri[],r:number,z:number):boolean {
  return rayHits(tris,[r,0,z],[1,0,0]);
}
function axialAt(tris:Tri[],r:number):boolean {
  return rayHits(tris,[r,0,-2],[0,0,1]);
}
function verify(parts:Map<string,Tri[]>) {
  expect([...parts.keys()]).toEqual(['single-piece-bored-barbed-fitting']);
  const body=parts.get('single-piece-bored-barbed-fitting')!;
  expect(components(body),'spigot and hex wrench are one connected casting').toBe(1);
  const pts=body.flat();
  const min=[0,1,2].map(k=>Math.min(...pts.map(v=>v[k]))),max=[0,1,2].map(k=>Math.max(...pts.map(v=>v[k])));
  expect(min[2]).toBeCloseTo(0,2);expect(max[2]).toBeCloseTo(36,2);
  expect(max[0]-min[0]).toBeCloseTo(28,2);
  expect(max[1]-min[1]).toBeCloseTo(2*28/Math.sqrt(3),2);
  // Each barcode is not a straight cylindrical washer. Follow the actual tapered
  // outward wall through its rise and rapid undercut on the retention shoulder.
  for(const bottom of [4,11,18]) {
    expect(outerAt(body,11.25,bottom+0.5),`start of taper ${bottom}`).toBe(false);
    expect(outerAt(body,11.25,bottom+2.5),`high taper ${bottom}`).toBe(true);
    expect(outerAt(body,11.25,bottom+3.25),`sharp retaining shoulder ${bottom}`).toBe(false);
    expect(outerAt(body,9,bottom+2.5),`wall below barb ${bottom}`).toBe(true);
  }
  for(const r of [0,5.8])expect(axialAt(body,r),`full-length axial bore at r=${r}`).toBe(false);
  expect(axialAt(body,7.5),'real spigot wall around bore').toBe(true);
  // Six genuine flats: across flats X=28, while the ±Y vertices extend beyond 15 mm.
  expect(rayHits(body,[13.5,0,32],[1,0,0]),'X flat interior').toBe(true);
  expect(rayHits(body,[14.5,0,32],[1,0,0]),'X flat exterior').toBe(false);
  expect(rayHits(body,[0,15,32],[0,1,0]),'hex vertex region at Y=15').toBe(true);
}
beforeAll(async()=>{await initOcct();},30000);
describe('illustrative hose barb adapter real tapered lips and bore',()=>{
  it('committed source-backed 4:3 preview matches the native CAD publishing preset',async()=>{
    const rendered=await renderManufacturingCatalogPreview(resolve(root,sourcePath));
    const preview=readFileSync(resolve(root,'catalog/kits/standard-components/previews/hose-barb-adapter.png'));
    const image=async (png: Uint8Array) => {
      const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      return {width:info.width,height:info.height,data};
    };
    const diff=pixelDiff(await image(rendered),await image(preview));
    expect(previewMatches(diff),`stale or mismatched native CAD preview: ${JSON.stringify(diff)}`).toBe(true);
  },60000);
  for(const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const){
    it(`${size}: three tapered retention lips, one through-bored connected body and hex wrench`,async()=>{
      const source=readFileSync(resolve(root,sourcePath),'utf8');
      const built=await buildCatalogAssetWithGlb(root,sourcePath);
      const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
      const exp=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({code,fileName:'hose-barb-adapter.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}}});
      expect(exp.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(await readMeshes(exp.bytes,scale));
      expect(built.asset.description).toMatch(/not manufacturer-grade CAD/i);
      expect(built.asset.description).toMatch(/three real tapered retention lips/i);
      expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
      expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
    },60000);
  }
  it('original source has three separate cylindrical collars, not tapered connected barbs',async()=>{
    const source=readFileSync(resolve(root,'docs/quality/evidence/hose-barb-20261115/original-source.kcad.ts'),'utf8');
    const exp=await runAndExport({code:source,fileName:'old-hose-barb.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:500}}});
    expect(exp.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
    const parts=await readMeshes(exp.bytes,1);
    expect(parts.size).toBe(5);
    expect([...parts.keys()].filter(n=>n.startsWith('barb-')).length).toBe(3);
    expect(()=>verify(parts)).toThrow();
  },60000);
});
