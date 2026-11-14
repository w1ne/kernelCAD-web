// SPDX-License-Identifier: MIT
// The CC0 prop is not a rated collar, but its claimed set screw must have
// a drilled radial passage. Validate exported geometry, not just labels.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type V = [number, number, number];
type Tri = [V,V,V];
const root = resolve(import.meta.dirname, '../../..');
const sourcePath='catalog/kits/standard-components/shaft-collar.kcad.ts';
const source=readFileSync(resolve(root,sourcePath),'utf8');
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function rayHit(tris:Tri[],p:V,d:V):boolean {
  return tris.some(([a,b,c])=>{
    const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
    if(Math.abs(det)<1e-9)return false;
    const f=1/det,s=sub(p,a),u=f*dot(s,h),q=cross(s,e1),v=f*dot(d,q),t=f*dot(e2,q);
    return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7&&t>1e-6&&t<100;
  });
}
async function meshes(bytes:Uint8Array):Promise<Map<string,Tri[]>> {
  const doc=await new NodeIO().readBinary(bytes),out=new Map<string,Tri[]>();
  for(const node of doc.getRoot().listNodes()) {
    const mesh=node.getMesh();if(!mesh)continue;
    const m=node.getWorldMatrix(),tris:Tri[]=[];
    for(const primitive of mesh.listPrimitives()) {
      const pos=primitive.getAttribute('POSITION')!,idx=primitive.getIndices(),count=idx?idx.getCount():pos.getCount();
      for(let i=0;i<count;i+=3)tris.push([0,1,2].map(j=>{
        const v=pos.getElement(idx?idx.getScalar(i+j):i+j,[]);
        return [0,1,2].map(k=>1000*(m[k]!*v[0]!+m[k+4]!*v[1]!+m[k+8]!*v[2]!+m[k+12]!)) as V;
      }) as Tri);
    }
    out.set(node.getName(),tris);
  }
  return out;
}
function assertPassage(parts:Map<string,Tri[]>,scale:number):void {
  expect([...parts.keys()].sort()).toEqual(['collar-ring','radial-set-screw']);
  const ring=parts.get('collar-ring')!,screw=parts.get('radial-set-screw')!;
  expect(ring.length).toBeGreaterThan(0);expect(screw.length).toBeGreaterThan(0);
  const center:[number,number,number]=[0,6*scale,0];
  // Source -Y becomes one of the two GLB horizontal depth directions. The
  // ring must be open on exactly one side, while the other side stays solid.
  const dirs:V[]=[[0,0,1],[0,0,-1]];
  expect(dirs.filter(d=>!rayHit(ring,center,d))).toHaveLength(1);
  const opening=dirs.find(d=>!rayHit(ring,center,d))!;
  expect(rayHit(screw,center,opening),'set screw occupies the radial bore').toBe(true);
  expect(rayHit(ring,[5*scale,6*scale,0],opening),'surrounding wall survives drilling').toBe(true);
  expect(rayHit(ring,center,[1,0,0]),'annular wall survives outside the radial bore').toBe(true);
}
async function variant(code:string):Promise<Map<string,Tri[]>>{
  const e=await runAndExport({code,fileName:'shaft-collar.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:300}}});
  expect(e.diagnostics.filter(d=>d.severity==='error')).toEqual([]);return meshes(e.bytes);
}
beforeAll(async()=>{await initOcct();},30000);
describe('shaft collar radial set screw fidelity',()=>{
  it('exports a drilled, open shaft collar and separate contacting screw',async()=>{
    const {asset,glb}=await buildCatalogAssetWithGlb(root,sourcePath);
    expect(asset.description).toMatch(/not manufacturing CAD/i);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM.map(n=>Math.round(n*1000)).sort((a,b)=>a-b)).toEqual([12,38,40]);
    assertPassage(await meshes(glb),1);
  },30000);
  it('fails the original solid-wall negative control',async()=>{
    const broken=source.replace('.subtract(radialBore)','');
    expect(broken).not.toBe(source);
    const ring=(await variant(broken)).get('collar-ring')!;
    const center:V=[0,6,0];
    expect(rayHit(ring,center,[0,0,1])).toBe(true);
    expect(rayHit(ring,center,[0,0,-1])).toBe(true);
  },30000);
  it('keeps the passage, screw and intact walls for both scaled props',async()=>{
    for(const [name,scale] of [['compact',.75],['large',1.25]] as const) {
      const code=source.replace("param('size', 'standard'",`param('size', '${name}'`);
      assertPassage(await variant(code),scale);
    }
  },60000);
});
