// SPDX-License-Identifier: MIT
// ULN2003 stepper driver board for 28BYJ-48 (32×22 mm).
const PCB_L=32.0, PCB_W=22.0, PCB_T=1.6;
const PCB='#1a6b3a', IC='#1a1a22', CU='#c8a040', HDR='#1a1a28', CONN='#2a2a32';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=4, pitch=2.54, hdrH=(n-1)*pitch+2.4, hdrY=(PCB_W-hdrH)/2;
const left=box(2.4,hdrH,2.5).color(HDR).translate(-2.4,hdrY,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const py=hdrY+1.2+i*pitch; pins.push(box(7,0.64,0.64).color(CU).translate(-7,py,PCB_T+0.95));}
const ic=box(19,7.5,3.5).color(IC).translate(6.5,7.0,PCB_T);
const sock=box(12,6,8).color(CONN).translate(18,2,PCB_T);
const asm=assembly('uln2003');
asm.part('pcb',pcb); asm.part('in-header',left); pins.forEach((p,i)=>asm.part(`in-${i}`,p));
asm.part('uln2003-dip',ic); asm.part('motor-socket',sock);
return asm.model();
