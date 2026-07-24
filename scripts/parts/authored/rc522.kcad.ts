// SPDX-License-Identifier: MIT
// RC522 RFID reader 40×60 mm with coil outline.
const PCB_L=40.0, PCB_W=60.0, PCB_T=1.6;
const PCB='#1a1a22', IC='#1a1a22', CU='#c8a040', HDR='#1a1a28', COIL='#c8a040';
const pcb=box(PCB_L,PCB_W,PCB_T).color(PCB);
const n=8, pitch=2.54, hdrW=(n-1)*pitch+2.4, hdrX=(PCB_L-hdrW)/2;
const headerBody=box(hdrW,2.4,2.5).color(HDR).translate(hdrX,-2.4,PCB_T);
const pins:Shape[]=[];
for(let i=0;i<n;i++){const px=hdrX+1.2+i*pitch; pins.push(box(0.64,7,0.64).color(CU).translate(px,-7,PCB_T+0.95));}
const ic=box(5,5,1.0).color(IC).translate(17.5,8,PCB_T);
// Antenna coil as concentric frames (visual)
const coils:Shape[]=[];
for(let i=0;i<4;i++){
  const m=4+i*3;
  coils.push(box(PCB_L-2*m,0.6,0.2).color(COIL).translate(m,12+m,PCB_T));
  coils.push(box(PCB_L-2*m,0.6,0.2).color(COIL).translate(m,PCB_W-m-0.6,PCB_T));
  coils.push(box(0.6,PCB_W-12-2*m,0.2).color(COIL).translate(m,12+m,PCB_T));
  coils.push(box(0.6,PCB_W-12-2*m,0.2).color(COIL).translate(PCB_L-m-0.6,12+m,PCB_T));
}
const asm=assembly('rc522');
asm.part('pcb',pcb); asm.part('header',headerBody); pins.forEach((p,i)=>asm.part(`p-${i}`,p));
asm.part('mfrc522',ic); coils.forEach((c,i)=>asm.part(`coil-${i}`,c));
return asm.model();
