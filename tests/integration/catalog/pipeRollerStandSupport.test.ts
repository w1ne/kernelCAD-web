// SPDX-License-Identifier: MIT
// Measured scene identity and support contacts, without a working-load claim.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
type V = [number, number, number];
type Tri = [V, V, V];
const root = resolve(import.meta.dirname, '../../..');
const file = 'catalog/kits/construction-equipment/pipe-roller-stand.kcad.ts';
const source = readFileSync(resolve(root, file), 'utf8');
const sub = (a: V, b: V): V => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a: V, b: V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: V, b: V): V => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function hit(tris: Tri[], origin: V, dir: V): boolean {
  return tris.some(([a,b,c]) => {
    const e1=sub(b,a), e2=sub(c,a), h=cross(dir,e2), determinant=dot(e1,h);
    if (Math.abs(determinant)<1e-9) return false;
    const q=sub(origin,a), u=dot(q,h)/determinant, r=cross(q,e1);
    const v=dot(dir,r)/determinant, distance=dot(e2,r)/determinant;
    return u>=-1e-7 && v>=-1e-7 && u+v<=1+1e-7 && distance>1e-7;
  });
}
async function meshes(code: string, scale = 1): Promise<Map<string, Tri[]>> {
  const result = await runAndExport({ code, fileName: 'pipe-roller-stand.kcad.ts',
    scriptDir: resolve(root,'catalog/kits/construction-equipment'), format:'glb',
    options:{format:'glb',style:'lowpoly',lowpoly:{maxTriangles:2200}} });
  expect(result.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
  const doc=await new NodeIO().readBinary(result.bytes), parts=new Map<string,Tri[]>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh=node.getMesh(); if (!mesh) continue;
    const m=node.getWorldMatrix(), tris:Tri[]=[];
    for (const primitive of mesh.listPrimitives()) {
      const positions=primitive.getAttribute('POSITION')!, indices=primitive.getIndices();
      const count=indices?indices.getCount():positions.getCount();
      const point=(i:number):V=>{
        const v=positions.getElement(indices?indices.getScalar(i):i,[]);
        const w=[0,1,2].map(k=>1000/scale*(m[k]!*v[0]!+m[k+4]!*v[1]!+m[k+8]!*v[2]!+m[k+12]!));
        return [w[0]!, -w[2]!, w[1]!];
      };
      for (let i=0;i<count;i+=3) tris.push([point(i),point(i+1),point(i+2)]);
    }
    parts.set(node.getName(),tris);
  }
  return parts;
}
function accept(parts:Map<string,Tri[]>):void {
  expect(parts.size).toBe(14);
  const range=(name:string,axis:number,lo:number,hi:number)=>{
    const vertices=parts.get(name)!.flat();
    expect(Math.min(...vertices.map(p=>p[axis]!)),`${name} lower ${axis}`).toBeCloseTo(lo,1);
    expect(Math.max(...vertices.map(p=>p[axis]!)),`${name} upper ${axis}`).toBeCloseTo(hi,1);
  };
  const feet:number[]=[];
  for(let i=0;i<3;i++) {
    const name=`tripod-leg-${i}`; range(name,2,0,610);
    const vertices=parts.get(name)!.flat().filter(p=>Math.abs(p[2])<.01);
    const x=vertices.reduce((n,p)=>n+p[0],0)/vertices.length;
    const y=vertices.reduce((n,p)=>n+p[1],0)/vertices.length;
    expect(Math.hypot(x,y)).toBeGreaterThan(210);
    feet.push((Math.atan2(y,x)*180/Math.PI+360)%360);
  }
  feet.sort((a,b)=>a-b);
  for(let i=0;i<3;i++)expect((feet[(i+1)%3]!-feet[i]!+360)%360).toBeCloseTo(120,0);
  range('tripod-hub',2,610,660); range('upright-post',2,660,760); range('roller-head-plate',2,760,784);
  for(const [side,y] of [['left',-65],['right',65]] as const) {
    const roller=`roller-${side}`, axle=`${roller}-axle`;
    range(roller,0,-110,110); range(roller,1,y-30,y+30); range(roller,2,805,865);
    range(axle,0,-130,130);
    expect(hit(parts.get(roller)!,[-150,y,835],[1,0,0]),'roller has a real axial bore').toBe(false);
    expect(hit(parts.get(roller)!,[-150,y+20,835],[1,0,0]),'roller annular stock exists').toBe(true);
    expect(hit(parts.get(axle)!,[-150,y,835],[1,0,0]),'axle spans the roller bore').toBe(true);
    for(const [end,lo,hi] of [['front',-130,-110],['rear',110,130]] as const) {
      const bracket=`${roller}-${end}-bracket`;
      range(bracket,0,lo,hi); range(bracket,2,784,864);
      expect(hit(parts.get(bracket)!,[-150,y,835],[1,0,0]),'support bracket bore is open').toBe(false);
      expect(hit(parts.get(bracket)!,[-150,y+15,835],[1,0,0]),'bracket material surrounds axle').toBe(true);
    }
  }
}
beforeAll(async()=>{await initOcct();},60_000);
describe('pipe roller stand support geometry',()=>{
  for(const scale of [.7,1,1.3]) {
    it(`carries two parallel rollers on bored supports at scale ${scale}`,async()=>{
      accept(await meshes(source.replace("param('scale', 1,",`param('scale', ${scale},`),scale));
    },120_000);
  }
  it('rejects a detached post even though the scene exports',async()=>{
    const detached=source.replace('translate(0, 0, 660)','translate(0, 0, 680)');
    expect(detached).not.toBe(source);
    const parts=await meshes(detached);
    expect(()=>accept(parts)).toThrow();
  },120_000);
});
