// SPDX-License-Identifier: MIT
// RA-02 LoRa SX1278 module 17x16 mm on carrier 25x35
const PCB_L=25, PCB_W=35, PCB_T=1.6;
const PCB='#1a1a22', MOD='#0f172a', CU='#c8a040', HDR='#1a1a28', ANT='#94a3b8';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=8, pitch=2.54, hdrW=(n-1)*pitch+2.4, hdrX=(PCB_L-hdrW)/2;
const headerBody=box(hdrW,2.4,2.5).color(HDR).translate(hdrX,-2.4,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const px=hdrX+1.2+i*pitch; pins.push(box(0.64,7,0.64).color(CU).translate(px,-7,PCB_T+0.95));}
const mod=box(17,16,2.5).color(MOD).translate(4,6,PCB_T);
const can=box(12,10,1.5).color('#64748b').translate(6.5,8,PCB_T+2.5);
const ant=box(2,12,0.8).color(ANT).translate(11.5,22,PCB_T);
const asm=assembly('lora-sx1278');
asm.part('pcb',pcb); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`p-${i}`,p));
asm.part('ra02',mod); asm.part('shield',can); asm.part('antenna',ant);
return asm.model();
