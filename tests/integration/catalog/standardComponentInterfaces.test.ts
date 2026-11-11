// SPDX-License-Identifier: MIT
// Structural regressions found while reviewing #1279. Check native-exported
// geometry and connectivity, not just title/parameter/PNG transport metadata.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';
type V = [number, number, number];
type Tri = [V,V,V];
const root=resolve(import.meta.dirname,'../../..');
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function hit(tris:Tri[],start:V,dir:V):boolean {
  return tris.some(v=>{
    const e1=sub(v[1],v[0]),e2=sub(v[2],v[0]),p=cross(dir,e2),det=dot(e1,p);
    if(Math.abs(det)<1e-9)return false;
    const t=sub(start,v[0]),u=dot(t,p)/det,q=cross(t,e1),b=dot(dir,q)/det,distance=dot(e2,q)/det;
    return u>=-1e-7&&b>=-1e-7&&u+b<=1+1e-7&&distance>1e-6&&distance<2000;
  });
}
async function sourceMeshes(glb:Uint8Array) {
  // Exported mesh positions retain source millimetres; conversion to metres
  // and Y-up occurs at the scene root. Normalize supported scale below.
  const doc=await new NodeIO().readBinary(glb),out=new Map<string,Tri[]>();
  for(const node of doc.getRoot().listNodes()) {
    const mesh=node.getMesh();if(!mesh)continue;
    const tris:Tri[]=[];
    for(const primitive of mesh.listPrimitives()) {
      const pos=primitive.getAttribute('POSITION')!,index=primitive.getIndices();
      const count=index?index.getCount():pos.getCount();
      for(let i=0;i<count;i+=3)tris.push([0,1,2].map(k=>pos.getElement(index?index.getScalar(i+k):i+k,[]) as V) as Tri);
    }
    out.set(node.getName(),tris);
  }
  return out;
}
function components(tris:Tri[]):number {
  const parent=new Map<string,string>();
  const find=(key:string):string=>{const p=parent.get(key)!;if(p===key)return key;const r=find(p);parent.set(key,r);return r;};
  for(const tri of tris) {
    const keys=tri.map(v=>v.map(x=>x.toFixed(4)).join(','));
    for(const key of keys)if(!parent.has(key))parent.set(key,key);
    for(const key of keys.slice(1))parent.set(find(key),find(keys[0]));
  }
  return new Set([...parent.keys()].map(find)).size;
}
function verify(id:string,parts:Map<string,Tri[]>) {
  const all=[...parts.values()].flat();
  const range=(name:string,axis:number,low:number,high:number)=>{
    expect(parts.has(name),name).toBe(true);
    const points=parts.get(name)!.flat();
    expect(Math.min(...points.map(v=>v[axis])),name).toBeCloseTo(low,2);
    expect(Math.max(...points.map(v=>v[axis])),name).toBeCloseTo(high,2);
  };
  if(id==='pillow-block-housing') {
    expect([...parts.keys()].sort()).toEqual(['grease-nipple','inner-bearing-ring','pillow-block-casting']);
    expect(components(parts.get('pillow-block-casting')!)).toBe(1);
    // The old riser blocked the lower bore despite the visible hollow ring.
    for(const z of [23,28,33])expect(hit(all,[0,-30,z],[0,1,0]),`shaft bore at Z=${z}`).toBe(false);
    expect(hit(all,[9,-30,28],[0,1,0])).toBe(true);
    for(const x of [-30,30])expect(hit(all,[x,0,-10],[0,0,1])).toBe(false);
    range('pillow-block-casting',0,-42,42);
    const castingPoints=parts.get('pillow-block-casting')!.flat();
    expect(Math.min(...castingPoints.map(p=>p[2]))).toBeCloseTo(0,3);
    // The low-poly mesh samples the nominal R22 crown; allow 0.5 mm
    // chordal envelope error, not the exact BREP extremum at Z=50.
    expect(Math.max(...castingPoints.map(p=>p[2]))).toBeCloseTo(50,0);
  } else if(id==='piano-hinge') {
    expect([...parts.keys()].sort()).toEqual(['hinge-pin','left-leaf','right-leaf']);
    for(const name of ['left-leaf','right-leaf']) {
      expect(components(parts.get(name)!),`${name} must be one connected leaf/barrel solid`).toBe(1);
      expect(hit(parts.get(name)!,[-50,0,4],[1,0,0]),'pin bore must stay open').toBe(false);
      expect(hit(parts.get(name)!,[-50,3.2,4],[1,0,0]),'barrels must be present').toBe(true);
    }
    for(const x of [-32,0,32])for(const y of [-18,18])expect(hit(all,[x,y,-10],[0,0,1])).toBe(false);
    range('hinge-pin',0,-45,45);range('hinge-pin',2,2,6);
  } else if(id==='t-slot-angle-bracket') {
    for(const [name,lo,hi] of [['web-a',-24,-20],['web-b',20,24]] as const) {
      range(name,0,lo,hi);range(name,1,-18,15);range(name,2,5,35);
    }
    for(const x of [-13,13]) {
      expect(hit(all,[x,-6,-10],[0,0,1]),'base mounting bore').toBe(false);
      expect(hit(all,[x,-40,24],[0,1,0]),'wall mounting bore').toBe(false);
    }
    expect(hit(all,[0,-6,-10],[0,0,1])).toBe(true);
    expect(hit(all,[0,-40,24],[0,1,0])).toBe(true);
  } else {
    expect([...parts.keys()].sort()).toEqual(['mounting-plate','rubber-tire','swivel-fork','wheel-axle','wheel-hub']);
    expect(components(parts.get('swivel-fork')!)).toBe(1);
    for(const name of ['swivel-fork','wheel-hub','rubber-tire']) {
      expect(hit(parts.get(name)!,[0,-20,16],[0,1,0]),`${name} axle bore`).toBe(false);
    }
    expect(hit(parts.get('wheel-axle')!,[0,-20,16],[0,1,0])).toBe(true);
    expect(hit(parts.get('wheel-hub')!,[4,-20,16],[0,1,0])).toBe(true);
    for(const x of [-18,18])for(const y of [-12,12])expect(hit(all,[x,y,-10],[0,0,1])).toBe(false);
    range('rubber-tire',2,0,32);range('wheel-axle',1,-13,13);
    range('swivel-fork',2,12,46);range('mounting-plate',2,46,51);
  }
}
beforeAll(async()=>{await initOcct();},30000);
describe('standard-component interfaces and connected bodies',()=>{
  for(const id of ['caster-wheel','pillow-block-housing','piano-hinge','t-slot-angle-bracket']) {
    it(`${id}: connected supports and open interfaces at default and both size limits`,async()=>{
      const sourcePath=`catalog/kits/standard-components/${id}.kcad.ts`;
      const source=readFileSync(resolve(root,sourcePath),'utf8');
      const built=await buildCatalogAssetWithGlb(root,sourcePath);
      expect(built.asset.description).toMatch(/illustrative CC0/i);
      expect(built.asset.stats.minUpM).toBeCloseTo(0,6);
      expect(built.asset.stats.triangles).toBeLessThanOrEqual(built.asset.triangleBudget);
      for(const [size,scale] of [['standard',1],['compact',0.75],['large',1.25]] as const) {
        const code=source.replace("param('size', 'standard'",`param('size', '${size}'`);
        const exported=size==='standard'?{bytes:built.glb,diagnostics:[]}:await runAndExport({code,fileName:`${id}.kcad.ts`,scriptDir:resolve(root,'catalog/kits/standard-components'),
          format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:built.asset.triangleBudget}}});
        expect(exported.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
        const parts=await sourceMeshes(exported.bytes);
        for(const tris of parts.values())for(const tri of tris)for(const point of tri)for(let i=0;i<3;i++)point[i]/=scale;
        verify(id,parts);
      }
    },60000);
  }
});
