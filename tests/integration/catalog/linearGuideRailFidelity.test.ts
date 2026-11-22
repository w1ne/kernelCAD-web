// SPDX-License-Identifier: MIT
// Hardware identity: a mounting hole underneath an uninterrupted raised rail
// is not an accessible bolt passage. Test the actual native triangle mesh.
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
const sourcePath = 'catalog/kits/standard-components/linear-guide-rail.kcad.ts';
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
  expect([...parts.keys()].sort()).toEqual(['base','raceway']);
  const base=parts.get('base')!,rail=parts.get('raceway')!;
  expect(components(base)).toBe(1);expect(components(rail)).toBe(1);
  const mesh=[...parts.values()].flat();
  const hits=(x:number,y:number)=>rayHits(mesh,[x,y,25],[0,0,-1]);
  for (const x of [-45,-15,15,45]) for (const y of [-2.25,0,2.25]) {
    expect(hits(x,y),`unobstructed mounting passage at x=${x}, y=${y}`).toBe(false);
    expect(rayHits(rail,[x,y,21],[0,0,-1]),`upper raceway is also bored x=${x},y=${y}`).toBe(false);
    expect(rayHits(base,[x,y,9],[0,0,-1]),`lower foot remains bored x=${x},y=${y}`).toBe(false);
  }
  // Positive structural controls stop a deleted raceway or foot from falsely passing.
  for (const x of [-30,0,30]) {
    expect(hits(x,0),`continuous raceway between mounts at ${x}`).toBe(true);
    expect(rayHits(rail,[x,5,21],[0,0,-1]),'raised raceway retained').toBe(true);
    expect(rayHits(base,[x,13,21],[0,0,-1]),'wide mounting foot retained').toBe(true);
  }
  for (const [axis,min,max] of [[0,-60,60],[1,-16,16],[2,0,15]] as const){
    const points=mesh.flat().map(p=>p[axis]);
    expect(Math.min(...points)).toBeCloseTo(min,3);
    expect(Math.max(...points)).toBeCloseTo(max,3);
  }
}
beforeAll(async()=>{await initOcct()},30000);
describe('linear guide rail fastener access and realistic CC0 limits',()=>{
  for(const [choice,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const){
    it(`${choice}: four through passages, preserved continuous rail and foot`,async()=>{
      const source=readFileSync(resolve(root,sourcePath),'utf8');
      const built=await buildCatalogAssetWithGlb(root,sourcePath);
      const code=source.replace("param('size', 'standard'",`param('size', '${choice}'`);
      const exported=choice==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({
        code,fileName:'linear-guide-rail.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),
        format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}}
      });
      expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
      verify(await readMeshes(exported.bytes,scale));
      expect(built.asset.description).toMatch(/illustrative CC0/i);
      expect(built.asset.description).toMatch(/not manufacturer-grade/i);
      expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
      expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
    },60000);
  }
  it('negative control: original unbored raceway blocks mount access',async()=>{
    const source=readFileSync(resolve(root,sourcePath),'utf8');
    const broken=source.replace(/let raceway=block\(-60\*s,-7\*s,7\*s,120\*s,14\*s,8\*s\);[\s\S]*?a\.part\('raceway',raceway\.color\(steel\)\);/,"a.part('raceway',block(-60*s,-7*s,7*s,120*s,14*s,8*s).color(steel));");
    expect(broken).not.toBe(source);
    const exported=await runAndExport({code:broken,fileName:'original-linear-guide-rail.kcad.ts',
      scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',
      options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:300}}});
    expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
    const parts=await readMeshes(exported.bytes,1);const mesh=[...parts.values()].flat();
    for (const x of [-45,-15,15,45]) expect(rayHits(mesh,[x,0,25],[0,0,-1])).toBe(true);
    expect(()=>verify(parts)).toThrow();
  },60000);
});
