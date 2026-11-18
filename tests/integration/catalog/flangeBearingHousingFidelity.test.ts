// SPDX-License-Identifier: MIT
// The published flange bearing housing must pass shafts and fasteners through
// its actual geometry. A merely annular *boss* on a closed base is not enough.
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
const slug = 'standard-components/flange-bearing-housing';
const sourcePath = `catalog/kits/${slug}.kcad.ts`;
const sub = (a: V, b: V): V => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a: V, b: V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: V, b: V): V => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function rayHits(tris: Tri[], start: V, dir: V): boolean {
  return tris.some(v => {
    const e1 = sub(v[1],v[0]), e2 = sub(v[2],v[0]);
    const p = cross(dir,e2), det=dot(e1,p);
    if (Math.abs(det)<1e-9) return false;
    const t=sub(start,v[0]), u=dot(t,p)/det, q=cross(t,e1);
    const b=dot(dir,q)/det, distance=dot(e2,q)/det;
    return u>=-1e-7&&b>=-1e-7&&u+b<=1+1e-7&&distance>1e-6&&distance<100;
  });
}
async function readMeshes(glb: Uint8Array, scale: number): Promise<Map<string,Tri[]>> {
  const doc=await new NodeIO().readBinary(glb), out=new Map<string,Tri[]>();
  for(const node of doc.getRoot().listNodes()) {
    const mesh=node.getMesh(); if(!mesh) continue;
    const tris:Tri[]=[];
    for(const primitive of mesh.listPrimitives()) {
      const positions=primitive.getAttribute('POSITION')!,indices=primitive.getIndices();
      const length=indices?indices.getCount():positions.getCount();
      for(let i=0;i<length;i+=3) {
        tris.push([0,1,2].map(k=>{
          const point=positions.getElement(indices?indices.getScalar(i+k):i+k,[]) as V;
          return point.map(v=>v/scale) as V;
        }) as Tri);
      }
    }
    out.set(node.getName(),tris);
  }
  return out;
}
function connectedComponents(tris: Tri[]): number {
  const parent = new Map<string,string>();
  const find = (key:string):string => {
    const p=parent.get(key)!;
    if(p===key)return key;
    const root=find(p); parent.set(key,root); return root;
  };
  for(const triangle of tris) {
    const keys=triangle.map(point=>point.map(v=>v.toFixed(4)).join(','));
    for(const key of keys) if(!parent.has(key)) parent.set(key,key);
    for(const key of keys.slice(1)) parent.set(find(key),find(keys[0]));
  }
  return new Set([...parent.keys()].map(find)).size;
}
function checkGeometry(parts: Map<string, Tri[]>): void {
  const all=[...parts.values()].flat();
  // The old source has an annular boss but a solid plate directly underneath.
  for(const z of [-10,-2,10]) {
    expect(rayHits(all,[0,0,z],[0,0,1]),`unobstructed Ø17 shaft passage from Z=${z}`).toBe(false);
  }
  expect([...parts.keys()].sort()).toEqual(['one-piece-cast-iron-housing','plain-bronze-sleeve-bearing']);
  const casting=parts.get('one-piece-cast-iron-housing')!;
  const sleeve=parts.get('plain-bronze-sleeve-bearing')!;
  expect(connectedComponents(casting),'one piece housing, not two touching shells').toBe(1);
  expect(connectedComponents(sleeve),'continuous plain sleeve, not split fragments').toBe(1);
  for(const x of [-21,21]) {
    expect(rayHits(all,[x,0,-10],[0,0,1]),`Ø7 mounting bore at X=${x}`).toBe(false);
    expect(rayHits(casting,[x+4.5,0,-10],[0,0,1]),'solid around mounting bore').toBe(true);
  }
  expect(rayHits(sleeve,[9.5,0,-10],[0,0,1]),'bronze sleeve wall present').toBe(true);
  expect(rayHits(casting,[13,0,-10],[0,0,1]),'cast seat present').toBe(true);
  const points=casting.flat();
  for(const [axis,minimum,maximum] of [[0,-28,28],[1,-18,18],[2,0,20]] as const) {
    expect(Math.min(...points.map(v=>v[axis]))).toBeCloseTo(minimum,1);
    expect(Math.max(...points.map(v=>v[axis]))).toBeCloseTo(maximum,1);
  }
}
beforeAll(async()=>{await initOcct();},30000);
describe('flange bearing housing functional geometry',()=>{
  it('has a through-shaft path, clear fastener bores and separate plain sleeve at all sizes',async()=>{
    const source=readFileSync(resolve(root,sourcePath),'utf8');
    const built=await buildCatalogAssetWithGlb(root,sourcePath);
    expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
    expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
    for(const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const) {
      const changed=source.replace("param('size', 'standard'",`param('size', '${size}'`);
      const exported=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
        code:changed,fileName:'flange-bearing-housing.kcad.ts',
        scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
        options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}},
      });
      expect(exported.diagnostics.filter(d=>d.severity==='error'),size).toEqual([]);
      checkGeometry(await readMeshes(exported.bytes,scale));
    }
    expect(built.asset.description).toMatch(/Illustrative CC0/i);
    expect(built.asset.description).toMatch(/Not a ball bearing/i);
  },90000);
});
