// SPDX-License-Identifier: MIT
// SIM800L GSM mini board 25x23 mm
const PCB_L=25, PCB_W=23, PCB_T=1.0;
const PCB='#1a1a22', MOD='#0f172a', CU='#c8a040', HDR='#1a1a28';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=6, pitch=2.54, hdrH=(n-1)*pitch+2.4, hdrY=(PCB_W-hdrH)/2;
const headerBody=box(2.4,hdrH,2.5).color(HDR).translate(-2.4,hdrY,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const py=hdrY+1.2+i*pitch; pins.push(box(7,0.64,0.64).color(CU).translate(-7,py,PCB_T+0.95));}
const mod=box(18,16,2.2).color(MOD).translate(4,3.5,PCB_T);
const can=box(12,10,1.2).color('#64748b').translate(6,5,PCB_T+2.2);
const sim=box(14,10,0.8).color('#334155').translate(5,PCB_W-11,0);
const asm=assembly('sim800l');
asm.part('pcb',pcb); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`p-${i}`,p));
asm.part('module',mod); asm.part('shield',can); asm.part('sim-slot',sim);
return asm.model();
