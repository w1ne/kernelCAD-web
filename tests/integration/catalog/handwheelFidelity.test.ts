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
const sourcePath = 'catalog/kits/standard-components/handwheel.kcad.ts';
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
function sample(parts: Map<string,Tri[]>, angle: number, radius: number): boolean {
  const theta = angle*Math.PI/180;
  return rayHits([...parts.values()].flat(), [radius*Math.cos(theta),-20,30-radius*Math.sin(theta)],[0,1,0]);
}
function verify(parts: Map<string,Tri[]>): void {
  expect(parts.size).toBe(5);
  expect([...parts.keys()].filter(name=>name.startsWith('spoke-')).sort()).toEqual(['spoke-0','spoke-120','spoke-240']);
  const rim = parts.get('rim')!, hub = parts.get('hub')!;
  expect(rim).toBeDefined(); expect(hub).toBeDefined();
  expect(components(rim)).toBe(1); expect(components(hub)).toBe(1);
  for (const angle of [0,120,240]) {
    const spoke=parts.get(`spoke-${angle}`)!;
    expect(components(spoke), 'each spoke is one connected solid').toBe(1);
    const theta=angle*Math.PI/180;
    for (const radius of [8,16,25]) {
      const from:V=[radius*Math.cos(theta),-20,30-radius*Math.sin(theta)];
      expect(rayHits(spoke,from,[0,1,0]),`radial spoke ${angle} reaches radius ${radius}`).toBe(true);
      if(radius===8)expect(rayHits(hub,from,[0,1,0]),'real radial hub overlap').toBe(true);
      if(radius===25)expect(rayHits(rim,from,[0,1,0]),'real radial rim overlap').toBe(true);
    }
    const ys=spoke.flat().map(v=>v[1]);
    expect(Math.min(...ys), 'spokes centered axially within rim').toBeCloseTo(-2.5,3);
    expect(Math.max(...ys)).toBeCloseTo(2.5,3);
    const volume=Math.abs(spoke.reduce((sum,t)=>sum+dot(t[0],cross(t[1],t[2]))/6,0));
    expect(volume,'22 x 5 x 5 nominal spoke').toBeCloseTo(550,1);
  }
  for (const angle of [60,180,300]) expect(sample(parts,angle,16),`open gap at ${angle} degrees`).toBe(false);
  const points=[...parts.values()].flat().flat();
  for (const [axis,lo,hi] of [[0,-30,30],[1,-9,9],[2,0,60]] as const) {
    expect(Math.min(...points.map(p=>p[axis]))).toBeCloseTo(lo,3);
    expect(Math.max(...points.map(p=>p[axis]))).toBeCloseTo(hi,3);
  }
  // Keep the explicitly labelled hub envelope; do not claim a mounting bore.
  expect(sample(parts,0,0),'solid hub matches the stated envelope limitation').toBe(true);
}
beforeAll(async()=>{await initOcct();},30000);
describe('illustrative handwheel spoke identity',()=>{
  for(const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const) {
    it(`${size}: exactly three radial spokes join the hub and rim`,async()=>{
      const source=readFileSync(resolve(root,sourcePath),'utf8');
      const built=await buildCatalogAssetWithGlb(root,sourcePath);
      const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
      const exported=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
        code,fileName:'handwheel.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}},
      });
      expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(await readMeshes(exported.bytes,scale));
      expect(built.asset.description).toMatch(/illustrative CC0/i);
      expect(built.asset.description).toMatch(/three-spoke/i);
      expect(built.asset.description).toMatch(/no shaft bore/i);
      expect(built.asset.description).toMatch(/not manufacturer-grade/i);
      expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
      expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
    },60000);
  }
  it('negative control: the original diametral bars fill all six radial positions',async()=>{
    const source=readFileSync(resolve(root,sourcePath),'utf8')
      .replace('[0,120,240]','[0,60,120]')
      .replace('box(22*s,5*s,5*s,true).translate(16*s,0,0).rotateY(angle).translate(0,0,30*s)',
        'box(52*s,5*s,5*s,true).rotateY(angle).translate(0,3*s,30*s)');
    const exported=await runAndExport({code:source,fileName:'original-handwheel.kcad.ts',
      scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
      options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:340}},
    });
    expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
    const parts=await readMeshes(exported.bytes,1);
    for(const angle of [0,60,120,180,240,300])expect(sample(parts,angle,16)).toBe(true);
    expect(()=>verify(parts)).toThrow();
  },60000);
});
