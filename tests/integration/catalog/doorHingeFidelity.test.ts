// SPDX-License-Identifier: MIT
// Native regressions for the illustrative hinge: a plausible PNG is not proof
// that its separate pivot pin has an open passage through connected leaves.
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
const sourcePath = 'catalog/kits/standard-components/door-hinge.kcad.ts';
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
  const structural=[...parts].filter(([name])=>name!=='brass-pivot-pin'&&!name.includes('fastener'));
  const allStructural=structural.flatMap(([,tris])=>tris);
  // This is the original-source negative control: old solid knuckles block
  // every axial ray although the separately drawn pin looks plausible.
  for(const x of [0,-1.8,1.8,-1.95,1.95]) {
    expect(rayHits(allStructural,[x,0,-5],[0,0,1]),`open pivot passage at X=${x}`).toBe(false);
  }
  expect(structural.map(([name])=>name).sort()).toEqual(['left-leaf','right-leaf']);
  for(const [name,tris] of structural)expect(components(tris),`${name} is one connected leaf and its knuckles`).toBe(1);
  expect(parts.has('brass-pivot-pin')).toBe(true);
  const pin=parts.get('brass-pivot-pin')!;
  expect(components(pin)).toBe(1);
  expect(rayHits(pin,[0,0,-5],[0,0,1])).toBe(true);
  expect(rayHits(pin,[1.95,0,-5],[0,0,1]),'pin must not fill radial clearance').toBe(false);
  // A removed/missing barrel must not make the clearance test pass.
  for(const [name,zs] of [['left-leaf',[3.85,20,36.15]],['right-leaf',[12,28]]] as const) {
    for(const z of zs)expect(rayHits(parts.get(name)!,[0,-10,z],[0,1,0]),`${name} barrel wall at Z=${z}`).toBe(true);
  }
  // No missing mounting bores hidden under the twelve decorative screw heads.
  for(const [name,xs] of [['left-leaf',[-25,-13]],['right-leaf',[13,25]]] as const) {
    for(const x of xs)for(const z of [8,20,32])expect(rayHits(parts.get(name)!,[x,-10,z],[0,1,0])).toBe(false);
  }
  expect([...parts.keys()].filter(name=>name.includes('fastener'))).toHaveLength(12);
  const points=allStructural.flat();
  for(const [axis,min,max] of [[0,-32,32],[1,-5,5],[2,0,40]] as const) {
    // Y extrema lie on tessellated round barrels; allow 0.1 mm chordal
    // envelope error. Planar leaf width/height remain strict to 0.001 mm.
    const tolerance=axis===1?0.1:0.001;
    expect(Math.abs(Math.min(...points.map(v=>v[axis]))-min)).toBeLessThan(tolerance);
    expect(Math.abs(Math.max(...points.map(v=>v[axis]))-max)).toBeLessThan(tolerance);
  }
}
beforeAll(async()=>{await initOcct();},30000);
describe('illustrative door hinge pivot clearance',()=>{
  for(const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const) {
    it(`${size}: open pivot and mounting bores, connected leaves, separate pin`,async()=>{
      const source=readFileSync(resolve(root,sourcePath),'utf8');
      const built=await buildCatalogAssetWithGlb(root,sourcePath);
      const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
      const exported=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
        code,fileName:'door-hinge.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}},
      });
      expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(await readMeshes(exported.bytes,scale));
      expect(built.asset.description).toMatch(/illustrative CC0/i);
      expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
      expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
    },60000);
  }
});
