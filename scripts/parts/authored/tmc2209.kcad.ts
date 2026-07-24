// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// TMC2209 silent StepStick 15.2x20.3 mm
const PCB_L=15.24, PCB_W=20.32, PCB_T=1.57;
const PCB='#17191d', IC='#17171c', CU='#c8a040';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const pads:Shape[]=[];
for(let row=0;row<8;row++){
  pads.push(cylinder(0.08,0.85,20).color(CU).translate(1.27,1.27+row*2.54,PCB_T));
  pads.push(cylinder(0.08,0.85,20).color(CU).translate(13.97,1.27+row*2.54,PCB_T));
}
const qfn=box(5,5,1.0).color(IC).translate(5.1,7.5,PCB_T);
const pot=cylinder(1.15,1.5,20).color('#315b8a').translate(10,3,PCB_T);
const asm=assembly('tmc2209');
asm.part('pcb',pcb); pads.forEach((p,i)=>asm.part(`pad-${i}`,p));
asm.part('tmc2209-qfn',qfn); asm.part('vref-pot',pot);
return asm.model();
