// SPDX-License-Identifier: MIT
// PN532 NFC module ~43x40 mm with antenna area
const PCB_L=43, PCB_W=40, PCB_T=1.6;
const PCB='#1a2a4a', IC='#1a1a22', CU='#c8a040', HDR='#1a1a28';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=6, pitch=2.54, hdrW=(n-1)*pitch+2.4, hdrX=(PCB_L-hdrW)/2;
const headerBody=box(hdrW,2.4,2.5).color(HDR).translate(hdrX,-2.4,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const px=hdrX+1.2+i*pitch; pins.push(box(0.64,7,0.64).color(CU).translate(px,-7,PCB_T+0.95));}
const ic=box(6,6,1.2).color(IC).translate(18.5,6,PCB_T);
const coils:Shape[]=[];
for(let i=0;i<3;i++){const m=4+i*3; coils.push(box(PCB_L-2*m,0.5,0.15).color(CU).translate(m,14+m,PCB_T)); coils.push(box(PCB_L-2*m,0.5,0.15).color(CU).translate(m,PCB_W-m-0.5,PCB_T));}
const asm=assembly('pn532');
asm.part('pcb',pcb); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`p-${i}`,p));
asm.part('pn532-ic',ic); coils.forEach((c,i)=>asm.part(`coil-${i}`,c));
return asm.model();
