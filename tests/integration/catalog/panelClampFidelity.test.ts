// SPDX-License-Identifier: MIT
// Acceptance of a CC0 panel-clamp prop: a supported frame, through-bore,
// pressure screw and pad. These checks do not confer machining/load ratings.
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
const assetPath = 'catalog/kits/standard-components/panel-clamp.kcad.ts';
const source = readFileSync(resolve(root, assetPath), 'utf8');
const sub = (a:V,b:V):V => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross = (a:V,b:V):V => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a:V,b:V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function rayHit(tris:Tri[],p:V,d:V):boolean {
  return tris.some(([a,b,c])=>{
    const e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
    if(Math.abs(det)<1e-9) return false;
    const f=1/det,s=sub(p,a),u=f*dot(s,h),q=cross(s,e1),v=f*dot(d,q),t=f*dot(e2,q);
    return u>=-1e-7 && v>=-1e-7 && u+v<=1+1e-7 && t>1e-6 && t<100;
  });
}
async function readTriangles(bytes: Uint8Array):Promise<Map<string,Tri[]>> {
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
async function variant(code:string) {
  const e=await runAndExport({code,fileName:'panel-clamp.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:320}}});
  expect(e.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  return readTriangles(e.bytes);
}
function check(parts:Map<string,Tri[]>,s:number) {
  expect([...parts.keys()].sort()).toEqual(['c-frame','pressure-screw','rubber-pad']);
  const frame=parts.get('c-frame')!,screw=parts.get('pressure-screw')!,pad=parts.get('rubber-pad')!;
  expect(frame.length).toBeGreaterThan(0);
  expect(screw.length).toBeGreaterThan(0);
  expect(pad.length).toBeGreaterThan(0);
  // GLB Y = authored Z, GLB depth = minus authored Y.
  const below:[number,number,number]=[0,7*s,2*s];
  expect(rayHit(frame,below,[0,1,0]),'screw guide must be a through-bore, not a solid bridge').toBe(false);
  expect(rayHit(frame,[8*s,7*s,2*s],[0,1,0]),'the overhead bridge must survive outside the guide bore').toBe(true);
  expect(rayHit(screw,below,[0,1,0]),'separate pressure screw must traverse the bore').toBe(true);
  expect(rayHit(pad,below,[0,1,0]),'rubber pad must be below the supported screw').toBe(true);
}
beforeAll(async()=>{await initOcct();},30000);
describe('panel clamp mechanical identity',()=>{
  it('exports three separate functional bodies, a bored bridge and a real open throat',async()=>{
    const {asset,glb}=await buildCatalogAssetWithGlb(root,assetPath);
    expect(asset.description).toMatch(/illustrative CC0 low-poly/i);
    expect(asset.description).toMatch(/not load-rated.*manufacturing CAD/i);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM.map(n=>Math.round(n*1000)).sort((a,b)=>a-b)).toEqual([40,48,37].sort((a,b)=>a-b));
    check(await readTriangles(glb),1);
  },30000);
  it('rejects a guide without a drilled passage',async()=>{
    const broken=source.replace('.subtract(screwBore)','');
    expect(broken).not.toBe(source);
    const frame=(await variant(broken)).get('c-frame')!;
    expect(rayHit(frame,[0,7,2],[0,1,0])).toBe(true);
  },30000);
  it('rejects a floating screw without the overhead bridge',async()=>{
    const broken=source.replace('.union(bridge)','');
    expect(broken).not.toBe(source);
    // Removing the bridge makes the drill a non-intersecting subtraction.
    // The kernel must reject the disconnected clamp instead of exporting it.
    const e=await runAndExport({code:broken,fileName:'panel-clamp.kcad.ts',scriptDir:resolve(root,'catalog/kits/standard-components'),format:'glb',options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:320}}});
    expect(e.diagnostics.map(d=>d.code)).toContain('feature.subtractive-noop');
  },30000);
  it('scales all critical contact features on compact and large variants',async()=>{
    for(const [name,scale] of [['compact',.75],['large',1.25]] as const) {
      const code=source.replace("param('size', 'standard'",`param('size', '${name}'`);
      check(await variant(code),scale);
    }
  },60000);
});
