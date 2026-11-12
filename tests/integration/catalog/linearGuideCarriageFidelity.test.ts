// SPDX-License-Identifier: MIT
// A plausible end wiper is not evidence of an open rail channel.
// Measure the native low-poly export, including the original-source negative.
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
const sourcePath = 'catalog/kits/standard-components/linear-guide-carriage.kcad.ts';
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
  const all = [...parts.values()].flat();
  // Check the entire travel direction, not just a cavity at the middle.
  for (const y of [-6, 0, 6]) for (const z of [1, 6, 11]) {
    expect(rayHits(all, [-35,y,z], [1,0,0]), `rail passage +X at Y=${y},Z=${z}`).toBe(false);
    expect(rayHits(all, [35,y,z], [-1,0,0]), `rail passage -X at Y=${y},Z=${z}`).toBe(false);
  }
  const body = parts.get('steel-body')!;
  expect(body).toBeDefined();
  expect(components(body), 'body remains one connected U-shaped casting').toBe(1);
  // Positive controls: deleting the entire body must not pass the opening check.
  for (const y of [-9,9]) expect(rayHits(body,[-35,y,6],[1,0,0]),'sidewalls retained').toBe(true);
  expect(rayHits(body,[-35,0,13],[1,0,0]),'roof retained').toBe(true);
  const volume = Math.abs(body.reduce((sum,tri)=>sum+dot(tri[0],cross(tri[1],tri[2]))/6,0));
  expect(volume, '44x40x20 block minus 44x16x12 through-channel').toBeCloseTo(26752,1);
  for (const [axis,min,max] of [[0,-22,22],[1,-20,20],[2,0,20]] as const) {
    expect(Math.min(...body.flat().map(p=>p[axis]))).toBeCloseTo(min,3);
    expect(Math.max(...body.flat().map(p=>p[axis]))).toBeCloseTo(max,3);
  }
  expect(parts.size).toBe(10);
  expect([...parts.keys()].filter(n=>n.includes('wiper'))).toHaveLength(6);
  expect(parts.has('mounting-pad')).toBe(true);
  for (const x of [-10,10]) for (const y of [-8,8]) {
    expect(rayHits(parts.get('mounting-pad')!,[x,y,30],[0,0,-1]),'four pad wells retained').toBe(false);
  }
}
beforeAll(async()=>{ await initOcct(); },30000);
describe('illustrative linear-guide carriage rail passage',()=>{
  for (const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const) {
    it(`${size}: open end-to-end rail channel with connected body and retained walls`,async()=>{
      const source=readFileSync(resolve(root,sourcePath),'utf8');
      const built=await buildCatalogAssetWithGlb(root,sourcePath);
      const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
      const exported=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
        code,fileName:'linear-guide-carriage.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}},
      });
      expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(await readMeshes(exported.bytes,scale));
      expect(built.asset.description).toMatch(/illustrative CC0/i);
      expect(built.asset.description).toMatch(/not manufacturer-grade/i);
      expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
      expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
    },60000);
  }
  it('negative control: original blind underside pocket blocks both ends',async()=>{
    const source=readFileSync(resolve(root,sourcePath),'utf8').replace(
      'block(-23*s, -8*s, -s, 46*s, 16*s, 13*s)',
      'block(-18*s, -8*s, -s, 36*s, 16*s, 13*s)',
    );
    const exported=await runAndExport({code:source,fileName:'original-carriage.kcad.ts',
      scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
      options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:460}},
    });
    expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
    const parts=await readMeshes(exported.bytes,1),all=[...parts.values()].flat();
    expect(rayHits(all,[-35,0,6],[1,0,0])).toBe(true);
    expect(rayHits(all,[35,0,6],[-1,0,0])).toBe(true);
    expect(()=>verify(parts)).toThrow();
  },60000);
});
