// SPDX-License-Identifier: MIT
// MP1584 buck 22x17
const PCB_L=22, PCB_W=17, PCB_T=1.6;
const PCB='#1a1a22', CU='#c8a040', IND='#2a2a32', IC='#1a1a22';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const pads:Shape[]=[];
for(const [x,y] of [[1,2],[1,12],[18,2],[18,12]] as [number,number][]){pads.push(box(3,3,0.25).color(CU).translate(x,y,PCB_T));}
const ind=cylinder(5,3.5,24).color(IND).translate(11,8.5,PCB_T);
const pot=box(3.5,3.5,3).color('#0f172a').translate(5,6.5,PCB_T);
const asm=assembly('mp1584');
asm.part('pcb',pcb); pads.forEach((p,i)=>asm.part(`pad-${i}`,p));
asm.part('inductor',ind); asm.part('trim',pot);
return asm.model();
