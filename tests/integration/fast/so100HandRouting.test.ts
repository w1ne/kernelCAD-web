// SPDX-License-Identifier: MIT
// Fast checks for the seated SO-100 source data, hand rejection gates, and tube clearance refusal.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { makePhysicalUseCaseRecord } from '../../../src/modeling/mates/physicalUseCase';
import { reviewPhysicalUseCaseReachability } from '../../../src/modeling/mates/physicalUseCaseReachability';

const SO100 = 'examples/robot-arm/so100/so100-arm.kcad.ts';
const URDF = 'examples/robot-arm/so100/parts/sim/so100.urdf';
const HAND = 'tests/fixtures/robot-hand/rejected-five-finger-kinematic-hand.kcad.ts';
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
  it('SO-100 seated base and jaw parts have disjoint world-space bounds', () => {
    const urdf=readFileSync(URDF,'utf8'), root=join(process.cwd(),'examples/robot-arm/so100/parts/sim-seated');
    type Mat=[V,V,V];
    const mmul=(a:Mat,b:Mat):Mat=>[0,1,2].map(r=>[0,1,2].map(c=>a[r][0]*b[0][c]+a[r][1]*b[1][c]+a[r][2]*b[2][c]) as V) as Mat;
    const turn=(m:Mat,v:V):V=>m.map(row=>row[0]*v[0]+row[1]*v[1]+row[2]*v[2]) as V;
    const axis=(a:V,t:number):Mat=>{const [x,y,z]=a,c=Math.cos(t),s=Math.sin(t),q=1-c;return [[c+x*x*q,x*y*q-z*s,x*z*q+y*s],[y*x*q+z*s,c+y*y*q,z*y*q-x*s],[z*x*q-y*s,z*y*q+x*s,c+z*z*q]]};
    const rpy=(v:V):Mat=>mmul(axis([0,0,1],v[2]),mmul(axis([0,1,0],v[1]),axis([1,0,0],v[0])));
    const frames=new Map<string,{r:Mat;p:V}>([['base',{r:[[1,0,0],[0,1,0],[0,0,1]],p:[0,0,0]}]]);
    const links=[...urdf.matchAll(/<joint name="[^"]+" type="(?:revolute|fixed)">([\s\S]*?)<\/joint>/g)];
    for(const j of links){const body=j[1],parent=/<parent link="([^"]+)"/.exec(body)![1],child=/<child link="([^"]+)"/.exec(body)![1],o=/<origin xyz="([^"]+)" rpy="([^"]+)"/.exec(body)!,f=frames.get(parent);if(!f)continue;const xyz=nums(o[1]).map(x=>x*1000) as V,rr=rpy(nums(o[2]) as V),d=turn(f.r,xyz);frames.set(child,{r:mmul(f.r,rr),p:[f.p[0]+d[0],f.p[1]+d[1],f.p[2]+d[2]]});}
    const boxOf=(name:string,link:string)=>{const f=frames.get(link)!;const bytes=readFileSync(join(root,`${name}.stl`)),n=bytes.readUInt32LE(80),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let t=0;t<n;t++)for(let c=0;c<3;c++){const p=[0,1,2].map(k=>bytes.readFloatLE(84+t*50+12+c*12+k*4)*1000) as V,q=turn(f.r,p);for(let k=0;k<3;k++){const x=q[k]+f.p[k];lo[k]=Math.min(lo[k],x);hi[k]=Math.max(hi[k],x);}}return {lo,hi};};
    const base=boxOf('Base','base'), jaw=boxOf('Moving_Jaw','jaw');
    const overlap=base.lo.every((x,k)=>Math.min(base.hi[k],jaw.hi[k])-Math.max(x,jaw.lo[k])>0);
    expect(overlap).toBe(false);
  });

  it('SO-100 example link joint origins match the URDF and produce finite link frames', () => {
    const src=readFileSync(SO100,'utf8'), urdf=readFileSync(URDF,'utf8');
    const scripted=[...src.matchAll(/name: '(pan|lift|elbow|wrist|roll|jaw)'[\s\S]*?xyz: \[([^\]]+)\], rpy: \[([^\]]+)\]/g)];
    const joints=[...urdf.matchAll(/<joint name="([^"]+)" type="revolute">([\s\S]*?)<\/joint>/g)];
    const byName=new Map(joints.map(j=>[j[1],j[2]]));
    const map:Record<string,string>={pan:'shoulder_pan',lift:'shoulder_lift',elbow:'elbow_flex',wrist:'wrist_flex',roll:'wrist_roll',jaw:'gripper'};
    expect(scripted.length).toBeGreaterThan(0);
    for(const s of scripted){const b=byName.get(map[s[1]])!;const o=/<origin xyz="([^"]+)" rpy="([^"]+)"/.exec(b)!;nums(s[2]).forEach((x,i)=>expect(x).toBeCloseTo(nums(o[1])[i]*1000,8));nums(s[3]).forEach((x,i)=>expect(x).toBeCloseTo(nums(o[2])[i]*180/Math.PI,2));}
    // Zero-pose link translations are the accumulated URDF origin translations.
    const frame=new Map<string,V>([['base',[0,0,0]]]);
    for(const j of joints){const parent=/<parent link="([^"]+)"/.exec(j[2])![1],child=/<child link="([^"]+)"/.exec(j[2])![1],o=/<origin xyz="([^"]+)"/.exec(j[2])!,p=frame.get(parent);if(!p)continue;const d=nums(o[1]).map(x=>x*1000);frame.set(child,[p[0]+d[0],p[1]+d[1],p[2]+d[2]]);}
    expect([...frame.values()].every(p=>p.every(Number.isFinite))).toBe(true);
    expect(I.flat().every(Number.isFinite)).toBe(true);
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
