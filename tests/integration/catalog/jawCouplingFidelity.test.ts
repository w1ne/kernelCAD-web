// SPDX-License-Identifier: MIT
// Semantic proof: a jaw coupling must place the elastomer fingers BETWEEN
// the six metal jaws. All six spider fingers originally intersected metal.
// Validate the actual exported GLB parts, with a deliberately broken control.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type Vec=[number,number];
type Part={name:string; footprint:Vec[]; minY:number; maxY:number};
const root=resolve(import.meta.dirname,'../../..');
const file=resolve(root,'catalog/kits/standard-components/jaw-coupling.kcad.ts');
const source=readFileSync(file,'utf8');

function hull(points:Vec[]):Vec[] {
  const uniq=[...new Map(points.map(v=>[`${v[0]},${v[1]}`,v])).values()]
    .sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o:Vec,p:Vec,q:Vec)=>(p[0]-o[0])*(q[1]-o[1])-(p[1]-o[1])*(q[0]-o[0]);
  const lower:Vec[]=[],upper:Vec[]=[];
  for (const v of uniq) { while(lower.length>1&&cross(lower.at(-2)!,lower.at(-1)!,v)<=0) lower.pop();lower.push(v); }
  for (const v of uniq.slice().reverse()) { while(upper.length>1&&cross(upper.at(-2)!,upper.at(-1)!,v)<=0) upper.pop();upper.push(v); }
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function overlap(a:Part,b:Part):boolean {
  if(Math.min(a.maxY,b.maxY)-Math.max(a.minY,b.minY)<=0.00005)return false;
  // SAT on the convex footprints of the cuboid parts, in exported XZ metres.
  // The Y intervals must also overlap. Do not reject real near-tangent joints.
  for(const poly of [a.footprint,b.footprint])for(let i=0;i<poly.length;i++){
    const x=poly[i]!,y=poly[(i+1)%poly.length]!;
    const axis:Vec=[y[1]-x[1],x[0]-y[0]];
    const project=(v:Vec)=>v[0]*axis[0]+v[1]*axis[1];
    const A=a.footprint.map(project),B=b.footprint.map(project);
    const penetration=Math.min(Math.max(...A),Math.max(...B))-Math.max(Math.min(...A),Math.min(...B));
    if(penetration<=0.00005*Math.hypot(...axis))return false;
  }
  return true;
}
async function overlapPairs(glb:Uint8Array):Promise<{names:string[],pairs:string[]}> {
  const doc=await new NodeIO().readBinary(glb);
  const parts=new Map<string,Part>();
  for(const node of doc.getRoot().listNodes()){
    const name=node.getName();if(!/^(drive-jaw-|driven-jaw-|spider-lobe-)/.test(name))continue;
    const mesh=node.getMesh();if(!mesh)continue;
    const m=node.getWorldMatrix();const footprint:Vec[]=[];let low=Infinity,high=-Infinity;
    for(const prim of mesh.listPrimitives()){
      const pos=prim.getAttribute('POSITION');if(!pos)continue;
      for(let i=0;i<pos.getCount();i++){
        const v=pos.getElement(i,[]);
        const x=m[0]!*v[0]!+m[4]!*v[1]!+m[8]!*v[2]!+m[12]!;
        const y=m[1]!*v[0]!+m[5]!*v[1]!+m[9]!*v[2]!+m[13]!;
        const z=m[2]!*v[0]!+m[6]!*v[1]!+m[10]!*v[2]!+m[14]!;
        footprint.push([x,z]);low=Math.min(low,y);high=Math.max(high,y);
      }
    }
    parts.set(name,{name,footprint:hull(footprint),minY:low,maxY:high});
  }
  const pairs:string[]=[];
  for(const [name,spider] of parts)if(name.startsWith('spider-lobe-'))
    for(const [metal,jaw] of parts)if(metal.includes('-jaw-')&&overlap(spider,jaw))pairs.push(`${name}/${metal}`);
  return {names:[...parts.keys()],pairs};
}
async function variant(code:string) {
  const result=await runAndExport({
    code,fileName:'jaw-coupling.kcad.ts',scriptDir:resolve(file,'..'),
    format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:520}},
  });
  expect(result.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  return overlapPairs(result.bytes);
}

beforeAll(async()=>{await initOcct();});
describe('jaw coupling low-poly component identity',()=>{
  it('retains 6 metal jaws and 6 spider lobes without any material overlap',async()=>{
    const {asset,glb}=await buildCatalogAssetWithGlb(root,'catalog/kits/standard-components/jaw-coupling.kcad.ts');
    expect(asset.description).toMatch(/not a rated torque\/fatigue or vendor manufacturing model/i);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0,6);
    const actual=await overlapPairs(glb);
    expect(actual.names.filter(n=>n.includes('-jaw-'))).toHaveLength(6);
    expect(actual.names.filter(n=>n.startsWith('spider-lobe-'))).toHaveLength(6);
    expect(actual.pairs).toEqual([]);
  },30000);
  it('detects all 6 collisions when the former co-rotated spider layout is restored',async()=>{
    const broken=source.replace('rotateZ(i*60+30)','rotateZ(i*60)');
    expect(broken).not.toBe(source);
    const found=await variant(broken);
    expect(found.pairs).toHaveLength(6);
  },30000);
  it('keeps the cleared interfaces in both scaled variants',async()=>{
    for(const name of ['compact','large']){
      const changed=source.replace("param('size', 'standard'",`param('size', '${name}'`);
      expect(changed).not.toBe(source);
      expect((await variant(changed)).pairs).toEqual([]);
    }
  },30000);
});
