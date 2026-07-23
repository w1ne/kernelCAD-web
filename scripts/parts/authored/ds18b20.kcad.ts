// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/ds18b20.kcad.ts
// DS18B20 TO-92 temperature probe + module board (15×15 mm) or bare TO-92.
const PCB_L=15.0, PCB_W=15.0, PCB_T=1.6;
const PCB='#1a6b3a', IC='#1a1a22', CU='#c8a040', HDR='#1a1a28';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=3, pitch=2.54, hdrH=(n-1)*pitch+2.4, hdrY=(PCB_W-hdrH)/2;
const headerBody=box(2.4,hdrH,2.5).color(HDR).translate(-2.4,hdrY,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const py=hdrY+1.2+i*pitch; pins.push(box(7,0.64,0.64).color(CU).translate(-7,py,PCB_T+0.95));}
// TO-92 package
const body=box(4.0,4.0,4.5).color(IC).translate(5.5,5.5,PCB_T);
const curve=cylinder(4.5,2.0,24).color(IC).translate(7.5,7.5,PCB_T);
const asm=assembly('ds18b20');
asm.part('pcb',pcb); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`pin-${i}`,p));
asm.part('to92-flat',body); asm.part('to92-curve',curve);
return asm.model();
