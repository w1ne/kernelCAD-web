// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/as5600.kcad.ts
//
// AS5600 12-bit magnetic rotary position sensor breakout.
// 22 × 18 mm; SOIC-8 above diametric magnet well; 5-pin header; DIR pad.

const PCB_L = 22.0;
const PCB_W = 18.0;
const PCB_T = 1.6;
const HOLE_R = 1.0;

const PCB = '#1a3a6e';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const MAG = '#5c1010';
const WELL = '#0c0c14';

const holes = [
  [2.0, 2.0],
  [PCB_L - 2.0, 2.0],
  [2.0, PCB_W - 2.0],
  [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

const n = 5;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = (PCB_L - hdrW) / 2;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.5, 0.64).color(CU).translate(px, -7.5, PCB_T + 0.95));
}

const mx = 11.0;
const my = 11.5;
// Magnet well ring + diametric magnet disk
const well = cylinder(0.5, 4.2, 40).color(WELL).translate(mx, my, PCB_T);
const magnet = cylinder(1.6, 3.0, 40).color(MAG).translate(mx, my, PCB_T + 0.4);
const magN = box(1.2, 2.4, 0.15).color('#8b2020').translate(mx - 0.6, my - 1.2, PCB_T + 2.0);

// AS5600 SOIC slightly offset so magnet remains visible
const soic = box(4.9, 3.9, 1.55).color(IC).translate(3.5, 8.5, PCB_T);
const pin1 = cylinder(0.18, 0.25, 12).color('#f0f0f8').translate(4.0, 9.0, PCB_T + 1.55);

const dirPad = box(2.6, 1.4, 0.2).color(CU).translate(16.5, 5.0, PCB_T);
const caps: Shape[] = [
  box(1.0, 0.5, 0.45).color(PASS).translate(4.0, 5.0, PCB_T),
  box(1.0, 0.5, 0.45).color(PASS).translate(6.0, 5.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(16.5, 14.5, PCB_T),
];

const asm = assembly('as5600');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('magnet-well', well);
asm.part('magnet', magnet);
asm.part('magnet-n-mark', magN);
asm.part('as5600-soic', soic);
asm.part('pin1-dot', pin1);
asm.part('dir-pad', dirPad);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
return asm.model();
