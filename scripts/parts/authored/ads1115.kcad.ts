// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/ads1115.kcad.ts
//
// ADS1115 16-bit I²C ADC breakout (Adafruit #1085 class).
// 25.4 × 17.8 mm blue FR4, 10-pin header, MSOP-style ADC package, ADDR pads.

const PCB_L = 25.4;
const PCB_W = 17.8;
const PCB_T = 1.6;
const HOLE_R = 1.0;

const PCB = '#1a3a6e';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const LED = '#38bdf8';

const holes = [
  [2.0, 2.0],
  [PCB_L - 2.0, 2.0],
  [2.0, PCB_W - 2.0],
  [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

const n = 10;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = (PCB_L - hdrW) / 2;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.5, 0.64).color(CU).translate(px, -7.5, PCB_T + 0.95));
}

// ADS1115 MSOP-10 body
const ic = box(3.0, 4.9, 1.1).color(IC).translate(11.2, 6.8, PCB_T);
const pin1 = cylinder(0.18, 0.22, 12).color('#f0f0f8').translate(11.45, 7.05, PCB_T + 1.1);
const leads: Shape[] = [];
for (let i = 0; i < 5; i++) {
  const ly = 6.95 + i * 0.9;
  leads.push(box(0.7, 0.28, 0.15).color(CU).translate(10.5, ly, PCB_T + 0.15));
  leads.push(box(0.7, 0.28, 0.15).color(CU).translate(14.2, ly, PCB_T + 0.15));
}

// ADDR / ALERT solder-bridge pads
const addr = box(2.8, 1.4, 0.2).color(CU).translate(4.0, 12.5, PCB_T);
const alert = box(2.8, 1.4, 0.2).color(CU).translate(18.5, 12.5, PCB_T);

const led = box(1.6, 0.8, 0.5).color(LED).translate(4.0, 7.0, PCB_T);
const caps: Shape[] = [
  box(1.0, 0.5, 0.45).color(PASS).translate(4.0, 9.5, PCB_T),
  box(1.0, 0.5, 0.45).color(PASS).translate(6.0, 9.5, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(18.5, 7.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(18.5, 9.5, PCB_T),
];

const asm = assembly('ads1115');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('ads1115-ic', ic);
asm.part('pin1-dot', pin1);
leads.forEach((l, i) => asm.part(`lead-${i}`, l));
asm.part('addr-pads', addr);
asm.part('alert-pads', alert);
asm.part('pwr-led', led);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
return asm.model();
