// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// KY-023 style dual-axis joystick module 34×26 mm.
const PCB_L=34.0, PCB_W=26.0, PCB_T=1.6;
const PCB='#1a1a22', CU='#c8a040', HDR='#1a1a28', BASE='#2a2a32', CAP='#3a3a48';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=5, pitch=2.54, hdrW=(n-1)*pitch+2.4, hdrX=(PCB_L-hdrW)/2;
const headerBody=box(hdrW,2.4,2.5).color(HDR).translate(hdrX,-2.4,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const px=hdrX+1.2+i*pitch; pins.push(box(0.64,7,0.64).color(CU).translate(px,-7,PCB_T+0.95));}
const base=box(18,18,6).color(BASE).translate(8,4,PCB_T);
const stick=cylinder(10,3.5,24).color(CAP).translate(17,13,PCB_T+6);
const cap=cylinder(2,6,24).color('#4a4a58').translate(17,13,PCB_T+16);
const asm=assembly('joystick');
asm.part('pcb',pcb); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`p-${i}`,p));
asm.part('pot-base',base); asm.part('stick',stick); asm.part('cap',cap);
return asm.model();
