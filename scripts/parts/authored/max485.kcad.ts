// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/max485.kcad.ts
//
// MAX485 TTL↔RS-485 transceiver breakout.
// 44 × 14 mm; DIP/SOIC MAX485; A/B screw terminal; RO DI DE RE headers.

const PCB_L = 44.0;
const PCB_W = 14.0;
const PCB_T = 1.6;
const HOLE_R = 1.0;

const PCB = '#1a6b3a';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const TERM = '#2a2a32';
const PASS = '#8a6a40';

const holes = [
  [2.0, 2.0],
  [PCB_L - 2.0, 2.0],
  [2.0, PCB_W - 2.0],
  [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 20).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// Left 4-pin (VCC RO RE DE) + right 4-pin style — single 8-pin common clone
const n = 4;
const pitch = 2.54;
const hdrH = (n - 1) * pitch + 2.4;
const hdrY = (PCB_W - hdrH) / 2;
const leftHdr = box(2.4, hdrH, 2.5).color(HDR).translate(-2.4, hdrY, PCB_T);
const rightHdr = box(2.4, hdrH, 2.5).color(HDR).translate(PCB_L, hdrY, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const py = hdrY + 1.2 + i * pitch;
  pins.push(box(7.0, 0.64, 0.64).color(CU).translate(-7.0, py, PCB_T + 0.95));
  pins.push(box(7.0, 0.64, 0.64).color(CU).translate(PCB_L + 0.5, py, PCB_T + 0.95));
}

// MAX485 DIP-8
const dip = box(9.5, 6.5, 3.3).color(IC).translate(17.0, 3.75, PCB_T);
const notch = cylinder(0.5, 0.9, 16).color(IC).translate(17.0, 7.0, PCB_T + 3.3);
const pin1 = cylinder(0.2, 0.25, 12).color('#f0f0f8').translate(17.5, 4.2, PCB_T + 3.3);
// DIP legs
const legs: Shape[] = [];
for (let i = 0; i < 4; i++) {
  const ly = 4.3 + i * 1.5;
  legs.push(box(1.2, 0.45, 0.3).color(CU).translate(15.8, ly, PCB_T + 0.2));
  legs.push(box(1.2, 0.45, 0.3).color(CU).translate(26.5, ly, PCB_T + 0.2));
}

// A/B screw terminal
const term = box(10.0, 8.0, 9.5).color(TERM).translate(30.0, 3.0, PCB_T);
const sa = box(2.0, 2.0, 1.0).color(CU).translate(32.0, 5.0, PCB_T + 9.5);
const sb = box(2.0, 2.0, 1.0).color(CU).translate(36.0, 5.0, PCB_T + 9.5);

const caps: Shape[] = [
  box(1.6, 0.8, 0.5).color(PASS).translate(10.0, 5.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(12.5, 5.0, PCB_T),
];
const led = box(1.6, 0.8, 0.5).color('#22c55e').translate(10.0, 9.5, PCB_T);

const asm = assembly('max485');
asm.part('pcb', pcb);
asm.part('left-header', leftHdr);
asm.part('right-header', rightHdr);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('max485-dip', dip);
asm.part('dip-notch', notch);
asm.part('pin1-dot', pin1);
legs.forEach((l, i) => asm.part(`dip-leg-${i}`, l));
asm.part('ab-terminal', term);
asm.part('screw-a', sa);
asm.part('screw-b', sb);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
asm.part('pwr-led', led);
return asm.model();
