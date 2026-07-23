// SPDX-License-Identifier: MIT
// AMS1117 LDO module 25×11 mm.
const PCB_L=25.0, PCB_W=11.0, PCB_T=1.2;
const PCB='#1a1a22', IC='#1a1a22', CU='#c8a040', TAB='#9ca3af';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const pads:Shape[]=[];
for (const [x,y] of [[1,2],[1,7],[21,2],[21,7]] as [number,number][]) {
  pads.push(box(3,2.5,0.25).color(CU).translate(x,y,PCB_T));
}
const body=box(6.5,6.5,1.8).color(IC).translate(9,2.2,PCB_T);
const tab=box(6.5,1.2,4.5).color(TAB).translate(9,8.7,PCB_T);
const asm=assembly('ams1117');
asm.part('pcb',pcb); pads.forEach((p,i)=>asm.part(`pad-${i}`,p));
asm.part('sot223',body); asm.part('tab',tab);
return asm.model();
