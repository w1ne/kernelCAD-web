// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/acs712.kcad.ts
//
// ACS712 Hall-effect current sensor module (green, screw terminals for IP+/IP−).
// 31 × 13 mm class; SOIC ACS712; VCC/OUT/GND header.

const PCB_L = 31.0;
const PCB_W = 13.0;
const PCB_T = 1.6;
const HOLE_R = 1.0;

const PCB = '#1a6b3a';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const TERM = '#2a2a32';
const PASS = '#8a6a40';

const holes = [
  [2.0, PCB_W / 2],
  [PCB_L - 2.0, PCB_W / 2],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 20).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// 3-pin analog header
const n = 3;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = (PCB_L - hdrW) / 2;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.0, 0.64).color(CU).translate(px, -7.0, PCB_T + 0.95));
}

// ACS712 SOIC-8
const soic = box(5.0, 4.0, 1.55).color(IC).translate(13.0, 4.5, PCB_T);
const pin1 = cylinder(0.18, 0.25, 12).color('#f0f0f8').translate(13.5, 5.0, PCB_T + 1.55);

// High-current screw terminals (IP+ / IP−) on board ends
const termL = box(7.0, 8.0, 9.0).color(TERM).translate(3.0, 2.5, PCB_T);
const termR = box(7.0, 8.0, 9.0).color(TERM).translate(21.0, 2.5, PCB_T);
const screwL = box(2.0, 2.0, 1.0).color(CU).translate(5.5, 5.0, PCB_T + 9.0);
const screwR = box(2.0, 2.0, 1.0).color(CU).translate(23.5, 5.0, PCB_T + 9.0);

// Thick current path copper pours (visual)
const pourL = box(4.0, 3.0, 0.2).color(CU).translate(9.5, 5.0, PCB_T);
const pourR = box(4.0, 3.0, 0.2).color(CU).translate(17.5, 5.0, PCB_T);

const caps: Shape[] = [
  box(1.6, 0.8, 0.5).color(PASS).translate(11.0, 9.5, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(14.5, 9.5, PCB_T),
];

const asm = assembly('acs712');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('acs712-soic', soic);
asm.part('pin1-dot', pin1);
asm.part('term-ip-plus', termL);
asm.part('term-ip-minus', termR);
asm.part('screw-plus', screwL);
asm.part('screw-minus', screwR);
asm.part('pour-plus', pourL);
asm.part('pour-minus', pourR);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
return asm.model();
