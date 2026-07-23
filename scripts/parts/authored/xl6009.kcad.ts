// SPDX-License-Identifier: MIT
// XL6009 boost 43x21
const PCB_L=43, PCB_W=21, PCB_T=1.6;
const PCB='#1e3a8a', CU='#c8a040', IND='#1a1a22', CAP='#1e293b';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const pads:Shape[]=[];
for(const [x,y] of [[1.5,2],[1.5,15],[38.5,2],[38.5,15]] as [number,number][]){pads.push(box(3,3,0.25).color(CU).translate(x,y,PCB_T));}
const ind=cylinder(8,6,28).color(IND).translate(22,10.5,PCB_T);
const cin=cylinder(10,4,24).color(CAP).translate(8,10.5,PCB_T);
const cout=cylinder(10,4,24).color(CAP).translate(34,10.5,PCB_T);
const pot=box(5,5,4).color('#0f172a').translate(14,3,PCB_T);
const asm=assembly('xl6009');
asm.part('pcb',pcb); pads.forEach((p,i)=>asm.part(`pad-${i}`,p));
asm.part('inductor',ind); asm.part('cin',cin); asm.part('cout',cout); asm.part('trim',pot);
return asm.model();
