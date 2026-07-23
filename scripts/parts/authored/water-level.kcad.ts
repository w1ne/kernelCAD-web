// SPDX-License-Identifier: MIT
// Water level sensor PCB probe 20×60 mm with traces.
const PCB_L=20.0, PCB_W=60.0, PCB_T=1.2;
const PCB='#1a1a22', CU='#c8a040', HDR='#1a1a28', TRACE='#4a90d9';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=3, pitch=2.54, hdrW=(n-1)*pitch+2.4, hdrX=(PCB_L-hdrW)/2;
const headerBody=box(hdrW,2.4,2.5).color(HDR).translate(hdrX,-2.4,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const px=hdrX+1.2+i*pitch; pins.push(box(0.64,7,0.64).color(CU).translate(px,-7,PCB_T+0.95));}
const traces:Shape[]=[];
for(let i=0;i<10;i++){traces.push(box(1.2,40,0.15).color(TRACE).translate(3+i*1.5,12,PCB_T));}
const asm=assembly('water-level');
asm.part('pcb',pcb); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`p-${i}`,p));
traces.forEach((t,i)=>asm.part(`trace-${i}`,t));
return asm.model();
