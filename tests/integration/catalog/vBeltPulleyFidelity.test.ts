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

type V = [number, number, number];
type Tri = [V, V, V];
const root = resolve(import.meta.dirname, '../../..');
const sourcePath = 'catalog/kits/standard-components/v-belt-pulley.kcad.ts';
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
function radialMaterial(tris: Tri[], r: number, z: number): boolean {
  return rayHits(tris,[r,0,z],[1,0,0]);
}
function axialMaterial(tris: Tri[], r: number): boolean {
  return rayHits(tris,[r,0,-5],[0,0,1]);
}
function bounds(tris: Tri[]) {
  const vertices=tris.flat();
  return {min:([0,1,2] as const).map(k=>Math.min(...vertices.map(v=>v[k]))),
    max:([0,1,2] as const).map(k=>Math.max(...vertices.map(v=>v[k])))};
}
function verify(parts: Map<string,Tri[]>) {
  expect([...parts.keys()].sort()).toEqual(['double-v-sheave','steel-bushing-envelope']);
  const sheave=parts.get('double-v-sheave')!,bushing=parts.get('steel-bushing-envelope')!;
  expect(components(sheave),'one connected grooved sheave').toBe(1);
  expect(components(bushing),'one connected bushing ring').toBe(1);
  const a=bounds(sheave), b=bounds(bushing);
  expect(a.min[2]).toBeCloseTo(2,3);expect(a.max[2]).toBeCloseTo(38,3);
  expect(b.min[2]).toBeCloseTo(0,3);expect(b.max[2]).toBeCloseTo(40,3);
  for(const axis of [0,1]) {
    expect(a.max[axis]-a.min[axis],'sheave nominal diameter').toBeCloseTo(72,2);
    expect(b.max[axis]-b.min[axis],'bushing nominal OD').toBeCloseTo(22,2);
  }
  const radius=(tris:Tri[])=>[Math.min(...tris.flat().map(v=>Math.hypot(v[0],v[1]))),
    Math.max(...tris.flat().map(v=>Math.hypot(v[0],v[1])))];
  expect(radius(sheave)[0]).toBeCloseTo(11.05,2);
  expect(radius(sheave)[1]).toBeCloseTo(36,2);
  expect(radius(bushing)[0]).toBeCloseTo(7,2);
  expect(radius(bushing)[1]).toBeCloseTo(11,2);
  // Two roots separated by a full-diameter centre land. Verify actual triangle occupancy.
  for(const z of [6.5,15.5,20,24.5,33.5])expect(radialMaterial(sheave,34,z),`land at Z=${z}`).toBe(true);
  for(const z of [11,29])expect(radialMaterial(sheave,28,z),`open V root at Z=${z}`).toBe(false);
  for(const z of [8.75,13.25,26.75,31.25])expect(radialMaterial(sheave,28,z),`sloped V flank at Z=${z}`).toBe(true);
  // The false step model has no taper: it is empty at Z=7, R=20.5.
  expect(radialMaterial(sheave,34,2.5),'full-diameter bottom lip').toBe(true);
  expect(radialMaterial(sheave,34,37.5),'full-diameter top lip').toBe(true);
  // Through axis, and a distinct unfilled gap between sheave and removable bushing.
  for(const r of [0,6,11.025])expect(axialMaterial([...parts.values()].flat(),r),`shaft bore/clearance at R=${r}`).toBe(false);
  expect(axialMaterial(bushing,8),'bushing ring intersects an axial ray at R=8').toBe(true);
  expect(axialMaterial(sheave,12),'sheave body intersects an axial ray at R=12').toBe(true);
}
beforeAll(async()=>{await initOcct();},30000);
describe('illustrative double V-belt pulley native identity',()=>{
  for(const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const) {
    it(`${size}: two genuine tapered V grooves and coaxial open bore`, async()=>{
      const source=readFileSync(resolve(root,sourcePath),'utf8');
      const built=await buildCatalogAssetWithGlb(root,sourcePath);
      const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
      const exported=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
        code,fileName:'v-belt-pulley.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}},
      });
      expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(await readMeshes(exported.bytes,scale));
      expect(built.asset.description).toMatch(/illustrative CC0/i);
      expect(built.asset.description).toMatch(/two tapered annular grooves/i);
      expect(built.asset.description).toMatch(/not manufacturer-grade CAD/i);
      expect(built.asset.description).toMatch(/load ratings are not specified/i);
      expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
      expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
    },60000);
  }
  it('original production source is a flat single-step silhouette, not a double-V sheave',async()=>{
    const originalPath=resolve(root,'docs/quality/evidence/v-belt-pulley-20261113/original-source.kcad.ts');
    const source=readFileSync(originalPath,'utf8');
    const exported=await runAndExport({code:source,fileName:'original-v-belt-pulley.kcad.ts',
      scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
      options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:420}},
    });
    expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
    const parts=await readMeshes(exported.bytes,1),all=[...parts.values()].flat();
    expect(parts.size).toBe(4);
    expect(radialMaterial(all,28,8.75),'original flat-step cannot form correct first groove flank').toBe(false);
    expect(radialMaterial(all,28,11),'original same-depth flat bottom').toBe(false);
    expect(radialMaterial(all,28,13.25),'original same-depth flat bottom').toBe(false);
    expect(()=>verify(parts),'original must fail semantic contract').toThrow();
  },60000);
});
