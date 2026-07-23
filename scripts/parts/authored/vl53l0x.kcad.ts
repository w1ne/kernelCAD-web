// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/vl53l0x.kcad.ts
//
// VL53L0X Time-of-Flight laser ranging breakout.
// 12.5 × 17.8 mm class (GY-VL53L0XV2); optical aperture; 4-pin header.

const PCB_L = 12.5;
const PCB_W = 17.8;
const PCB_T = 1.6;
const HOLE_R = 0.9;

const PCB = '#1a3a6e';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const LENS = '#1e293b';
const GLASS = '#334155';

const holes = [
  [2.0, 2.0],
  [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 20).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

const n = 4;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = (PCB_L - hdrW) / 2;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.0, 0.64).color(CU).translate(px, -7.0, PCB_T + 0.95));
}

// VL53 optical module body + dual apertures (emitter / receiver)
const module = box(4.4, 2.4, 1.0).color(IC).translate(4.05, 10.5, PCB_T);
const emit = cylinder(0.35, 0.55, 20).color(LENS).translate(5.2, 11.7, PCB_T + 1.0);
const recv = cylinder(0.35, 0.55, 20).color(GLASS).translate(7.4, 11.7, PCB_T + 1.0);
const hood = box(5.0, 3.0, 0.4).color('#0f172a').translate(3.75, 10.2, PCB_T + 0.95);

const caps: Shape[] = [
  box(1.0, 0.5, 0.45).color(PASS).translate(2.5, 5.0, PCB_T),
  box(1.0, 0.5, 0.45).color(PASS).translate(4.5, 5.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(8.5, 5.0, PCB_T),
];
const led = box(1.2, 0.6, 0.4).color('#22c55e').translate(9.0, 14.5, PCB_T);

const asm = assembly('vl53l0x');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('tof-module', module);
asm.part('emitter', emit);
asm.part('receiver', recv);
asm.part('optical-hood', hood);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
asm.part('pwr-led', led);
return asm.model();
