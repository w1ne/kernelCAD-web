// SPDX-License-Identifier: MIT
// MT3608 boost converter module 36×17 mm.
const PCB_L=36.0, PCB_W=17.0, PCB_T=1.6;
const PCB='#1a1a22', IC='#1a1a22', CU='#c8a040', IND='#2a2a32';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const pads:Shape[]=[];
for (const [x,y] of [[1.5,2],[1.5,12],[31.5,2],[31.5,12]] as [number,number][]) {
  pads.push(box(3,3,0.25).color(CU).translate(x,y,PCB_T));
}
const ind=cylinder(6,4,28).color(IND).translate(18,8.5,PCB_T);
const pot=box(4,4,3.5).color('#0f172a').translate(10,6.5,PCB_T);
const ic=box(3,3,1.2).color(IC).translate(24,7,PCB_T);
const asm=assembly('mt3608');
asm.part('pcb',pcb); pads.forEach((p,i)=>asm.part(`pad-${i}`,p));
asm.part('inductor',ind); asm.part('trim-pot',pot); asm.part('mt3608-ic',ic);
return asm.model();
