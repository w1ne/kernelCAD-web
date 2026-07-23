// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/inmp441.kcad.ts
// INMP441 I2S mic
const PCB_L=14, PCB_W=12, PCB_T=1.6, HOLE_R=1.0;
const PCB='#1a1a22', IC='#1a1a22', CU='#c8a040', HDR='#1a1a28', PASS='#8a6a40';
const holes=[[2,2],[PCB_L-2,2],[2,PCB_W-2],[PCB_L-2,PCB_W-2]].map(([x,y])=>cylinder(PCB_T+2,HOLE_R,20).translate(x,y,-1));
const pcb=box(PCB_L,PCB_W,PCB_T).subtract(...holes).color(PCB);
const n=6, pitch=2.54, hdrH=(n-1)*pitch+2.4, hdrY=(PCB_W-hdrH)/2;
const headerBody=box(2.4,hdrH,2.5).color(HDR).translate(-2.4,hdrY,PCB_T);
const headerPins:Shape[]=[];
for(let i=0;i<n;i++){const py=hdrY+1.2+i*pitch; headerPins.push(box(7,0.64,0.64).color(CU).translate(-7,py,PCB_T+0.95));}
const mic=cylinder(2.5,3.5,24).color("#2a2a32").translate(7,6,PCB_T); const mesh=cylinder(0.4,3,16).color("#6a6a78").translate(7,6,PCB_T+2.5);
const asm=assembly('inmp441');
asm.part('pcb',pcb); asm.part('header',headerBody); headerPins.forEach((p,i)=>asm.part(`pin-${i}`,p));
asm.part('mic',mic);
asm.part('mesh',mesh);
return asm.model();
