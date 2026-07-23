// SPDX-License-Identifier: MIT
// Rain drop sensor board + comparator module.
const PCB_L=40.0, PCB_W=28.0, PCB_T=1.2;
const PCB='#1a1a22', CU='#c8a040', HDR='#1a1a28', TRACE='#6a90b0';
const board=box(PCB_L,PCB_W,PCB_T).color(PCB);
const traces:Shape[]=[];
for(let i=0;i<12;i++){traces.push(box(PCB_L-4,0.8,0.12).color(TRACE).translate(2,3+i*2.0,PCB_T));}
const mod=box(22,16,1.6).color('#1a6b3a').translate(9,PCB_W+2,0);
const n=4, pitch=2.54, hdrH=(n-1)*pitch+2.4, hdrY=2;
const headerBody=box(2.4,hdrH,2.5).color(HDR).translate(PCB_L+2,hdrY+PCB_W,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const py=hdrY+1.2+i*pitch+PCB_W; pins.push(box(7,0.64,0.64).color(CU).translate(PCB_L+2.5,py,PCB_T+0.95));}
const asm=assembly('rain-sensor');
asm.part('sense-board',board); traces.forEach((t,i)=>asm.part(`t-${i}`,t));
asm.part('comparator',mod); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`p-${i}`,p));
return asm.model();
