// SPDX-License-Identifier: MIT
// Fast checks for the seated SO-100 source data, hand rejection gates, and tube clearance refusal.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { makePhysicalUseCaseRecord } from '../../../src/modeling/mates/physicalUseCase';
import { reviewPhysicalUseCaseReachability } from '../../../src/modeling/mates/physicalUseCaseReachability';
import { readFile } from 'node:fs/promises';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SO100 = join(REPO_ROOT, 'examples/robot-arm/so100/so100-arm.kcad.ts');
const URDF = join(REPO_ROOT, 'examples/robot-arm/so100/parts/sim/so100.urdf');
const HAND = join(REPO_ROOT, 'tests/fixtures/robot-hand/rejected-five-finger-kinematic-hand.kcad.ts');
const nums = (s: string) => (s.includes(',') ? s.split(',') : s.trim().split(/\s+/)).map((x) => { const m=/^\s*(-?[\d.]+)\s*\*\s*RAD\s*$/.exec(x); return m ? Number(m[1])*180/Math.PI : Number(x); });

type V = [number, number, number];
const I = [[1,0,0],[0,1,0],[0,0,1]] as const;
function makeUnreachableHand() {
  const api = createModelingApi({ session: new CaptureSession() });
  const hand = api.assembly('unreachable-hand');
  hand.part('palm',api.box(10,10,2)).connector('joint',{type:'axis',origin:{kind:'vec3',value:[0,0,0]},axis:[0,0,1]}).connector('target',{type:'frame',origin:{kind:'vec3',value:[100,100,0]}});
  hand.part('finger',api.box(2,2,2)).connector('joint',{type:'axis',origin:{kind:'vec3',value:[0,0,0]},axis:[0,0,1]}).connector('tip',{type:'frame',origin:{kind:'vec3',value:[1,0,0]}});
  hand.mate('finger-yaw','palm.joint','finger.joint','revolute',{limitsDeg:[-30,30]});
  return { hand, api };
}

const ROUTED = `
const a=assembly('route');
a.part('obstacle',box(8,8,8).translate(6,-4,-4));
tubeSpec({clearance:{default:3}});
const t=tube('line',{from:{point:[0,0,0],axis:[0,0,1]},to:{point:[20,0,0],axis:[0,0,-1]},via:[[0,0,5],[20,0,5]],od:2,wall:0.2,bendRadius:2});
a.part('line',t);
return a.model();`;

describe('SO-100, hand rejection, and routed STEP gate', () => {
  it('SO-100 seated base and jaw meshes have no surface contact', async () => {
    await initOcct();
    const root=join(REPO_ROOT,'examples/robot-arm/so100/parts/sim-seated');
    const loadStl=async(name:string)=>{
      const bytes=await readFile(join(root,`${name}.stl`)),count=bytes.readUInt32LE(80),positions=new Float32Array(count*9);
      for(let i=0;i<count*9;i++)positions[i]=bytes.readFloatLE(84+Math.floor(i/9)*50+12+(i%9)*4);
      return positions;
    };
    const [base,jaw]=await Promise.all([loadStl('Base'),loadStl('Moving_Jaw')]);
    const urdf=readFileSync(URDF,'utf8');
    type Mat=[V,V,V];
    const mmul=(a:Mat,b:Mat):Mat=>[0,1,2].map(r=>[0,1,2].map(c=>a[r][0]*b[0][c]+a[r][1]*b[1][c]+a[r][2]*b[2][c]) as V) as Mat;
    const axis=(a:V,t:number):Mat=>{const [x,y,z]=a,c=Math.cos(t),ss=Math.sin(t),q=1-c;return [[c+x*x*q,x*y*q-z*ss,x*z*q+y*ss],[y*x*q+z*ss,c+y*y*q,y*z*q-x*ss],[z*x*q-y*ss,z*y*q+x*ss,c+z*z*q]]};
    const rpy=(v:V):Mat=>mmul(axis([0,0,1],v[2]),mmul(axis([0,1,0],v[1]),axis([1,0,0],v[0])));
    const frames=new Map<string,{p:V;r:Mat}>([['base',{p:[0,0,0],r:[[1,0,0],[0,1,0],[0,0,1]]}]]);
    for(const joint of urdf.matchAll(/<joint name="[^"]+" type="(?:revolute|fixed)">([\s\S]*?)<\/joint>/g)){const body=joint[1],parent=/<parent link="([^"]+)"/.exec(body)![1],child=/<child link="([^"]+)"/.exec(body)![1],origin=/<origin xyz="([^\"]+)" rpy="([^\"]+)"/.exec(body)!,parentFrame=frames.get(parent);if(!parentFrame)continue;const xyz=nums(origin[1]).map(v=>v*1000) as V,rot=rpy(nums(origin[2]).map(v=>v*Math.PI/180) as V),delta=parentFrame.r.map(row=>row[0]*xyz[0]+row[1]*xyz[1]+row[2]*xyz[2]) as V;frames.set(child,{p:[parentFrame.p[0]+delta[0],parentFrame.p[1]+delta[1],parentFrame.p[2]+delta[2]],r:mmul(parentFrame.r,rot)});}
    const jawFrame=frames.get('jaw')!;
    const transformPoint=(point:V):V=>{const turned=jawFrame.r.map(row=>row[0]*point[0]+row[1]*point[1]+row[2]*point[2]) as V;return [turned[0]+jawFrame.p[0],turned[1]+jawFrame.p[1],turned[2]+jawFrame.p[2]]};
    const positions=(mesh:Float32Array)=>Float32Array.from(mesh,(value,index)=>{
      const start=index-index%3,point:V=[mesh[start],mesh[start+1],mesh[start+2]],world=transformPoint(point);return world[index%3];
    });
    const a=base,b=positions(jaw);
    const triangleHit=(p:V,q:V,r:V,x:V,y:V,z:V)=>{
      const sub=(u:V,v:V):V=>[u[0]-v[0],u[1]-v[1],u[2]-v[2]],cross=(u:V,v:V):V=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],dot=(u:V,v:V)=>u[0]*v[0]+u[1]*v[1]+u[2]*v[2];
      const hit=(u:V,v:V,w:V,A:V,B:V,C:V)=>{const e1=sub(v,u),e2=sub(w,u),h=cross(sub(C,A),e2),det=dot(e1,h);if(Math.abs(det)<1e-8)return false;const inv=1/det,s=sub(A,u),uu=inv*dot(s,h);if(uu<0||uu>1)return false;const qq=cross(s,e1),vv=inv*dot(sub(C,A),qq);if(vv<0||uu+vv>1)return false;const t=inv*dot(e2,qq);return t>1e-6&&t<1-1e-6;};
      return hit(p,q,r,x,y,z)||hit(x,y,z,p,q,r);
    };
    const triangleBounds=(vertices:Float32Array)=>{
      const rows:Array<{i:number;min:V;max:V}>=[];
      for(let i=0;i<vertices.length;i+=9){const tri=[0,1,2].map(v=>[vertices[i+v*3],vertices[i+v*3+1],vertices[i+v*3+2]] as V),min=[0,1,2].map(k=>Math.min(...tri.map(p=>p[k]))) as V,max=[0,1,2].map(k=>Math.max(...tri.map(p=>p[k]))) as V;rows.push({i,min,max});}
      return rows.sort((u,v)=>u.min[0]-v.min[0]);
    };
    const baseTriangles=triangleBounds(a),jawTriangles=triangleBounds(b);
    let intersects=false;
    let first=0;
    for(const ta of baseTriangles){while(first<jawTriangles.length&&jawTriangles[first].max[0]<ta.min[0]-0.01)first++;const p=[a[ta.i],a[ta.i+1],a[ta.i+2]] as V,q=[a[ta.i+3],a[ta.i+4],a[ta.i+5]] as V,r=[a[ta.i+6],a[ta.i+7],a[ta.i+8]] as V;
      for(let n=first;n<jawTriangles.length&&jawTriangles[n].min[0]<=ta.max[0]+0.01;n++){const tb=jawTriangles[n];if([1,2].some(k=>ta.min[k]>tb.max[k]+0.01||tb.min[k]>ta.max[k]+0.01))continue;const j=tb.i,x=[b[j],b[j+1],b[j+2]] as V,y=[b[j+3],b[j+4],b[j+5]] as V,z=[b[j+6],b[j+7],b[j+8]] as V;if(triangleHit(p,q,r,x,y,z)){intersects=true;break;}}
      if(intersects)break;
    }
    expect(intersects).toBe(false);
  });

  it('SO-100 example link-frame translations and rotations match URDF origins', () => {
    const src=readFileSync(SO100,'utf8'),urdf=readFileSync(URDF,'utf8');
    const scripted=[...src.matchAll(/name: '(pan|lift|elbow|wrist|roll|jaw)'[\s\S]*?xyz: \[([^\]]+)\], rpy: \[([^\]]+)\]/g)];
    const joints=[...urdf.matchAll(/<joint name="([^"]+)" type="(?:revolute|fixed)">([\s\S]*?)<\/joint>/g)],byName=new Map(joints.map(j=>[j[1],j[2]]));
    const names:Record<string,string>={pan:'shoulder_pan',lift:'shoulder_lift',elbow:'elbow_flex',wrist:'wrist_flex',roll:'wrist_roll',jaw:'gripper'};
    const degrees=(text:string)=>text.split(',').map(term=>{const rad=/^\s*(-?[\d.]+)\s*\*\s*RAD\s*$/.exec(term);return rad?Number(rad[1])*180/Math.PI:Number(term)});
    expect(scripted.length).toBeGreaterThan(0);
    for(const entry of scripted){const joint=byName.get(names[entry[1]])!,origin=/<origin xyz="([^"]+)" rpy="([^"]+)"/.exec(joint)!;const exampleXYZ=entry[2].split(',').map(Number),urdfXYZ=nums(origin[1]).map(x=>x*1000);exampleXYZ.forEach((value,i)=>expect(value).toBeCloseTo(urdfXYZ[i],6));const exampleRPY=degrees(entry[3]),urdfRPY=nums(origin[2]).map(x=>x*180/Math.PI);exampleRPY.forEach((value,i)=>expect(value).toBeCloseTo(urdfRPY[i],2));}
  });

  it('rejects a hand no-op cut through the interference certification gate', async () => {
    await initOcct();
    const handSource=readFileSync(HAND,'utf8');
    expect(handSource).toContain('palm-root');
    const code='const palm=box(10,10,2); const missedCutter=box(2,2,2).translate(100,100,100); return palm.subtract(missedCutter);';
    const r=await checkInterference({code,fileName:HAND});
    expect(r.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({code:'feature.subtractive-noop',severity:'error'})]));
  },4_500);

  it('rejects an unreachable hand contact across the allowed joint range', async () => {
    const {hand}=makeUnreachableHand();
    const useCase=makePhysicalUseCaseRecord('pinch',{contacts:[{a:'finger.tip',b:'palm.target',normal:[1,0,0],friction:0.5}],actuatorLimits:[{mate:'finger-yaw',maxTorqueNmm:10}],criteria:{maxSlipMm:0.1}});
    const issues=await reviewPhysicalUseCaseReachability(hand,useCase,{samplesPerMate:3});
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({contactA:'finger.tip',contactB:'palm.target'})]));
  },4_500);

  it('fails clearance on a tiny routed model and refuses its STEP export', async () => {
    await initOcct();
    const out=await runAndExport({code:ROUTED,fileName:'tiny-routed-clearance.kcad.ts',format:'step'});
    expect(out.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({code:'tube.clearance.violated',severity:'error'})]));
    expect(out.bytes.byteLength).toBe(0);
  },4_500);
});
