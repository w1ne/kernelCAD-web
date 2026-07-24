// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/hx711.kcad.ts
//
// HX711 24-bit load-cell amplifier breakout (common green dual-header module).
// 33 × 20 mm; MCU 4-pin + load-cell 4-pin; SOIC-16 HX711; rate jumper.

const PCB_L = 33.0;
const PCB_W = 20.0;
const PCB_T = 1.6;
const HOLE_R = 1.05;

const PCB = '#1a6b3a';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';

const holes = [
  [2.0, 2.0],
  [PCB_L - 2.0, 2.0],
  [2.0, PCB_W - 2.0],
  [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

function sideHeader(x0: number, outward: number): { body: Shape; pins: Shape[] } {
  const n = 4;
  const pitch = 2.54;
  const h = (n - 1) * pitch + 2.4;
  const y0 = (PCB_W - h) / 2;
  const body = box(2.4, h, 2.5).color(HDR).translate(x0, y0, PCB_T);
  const pins: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const py = y0 + 1.2 + i * pitch;
    const px = outward < 0 ? x0 - 7.0 : x0 + 2.4;
    pins.push(box(7.0, 0.64, 0.64).color(CU).translate(px, py, PCB_T + 0.95));
  }
  return { body, pins };
}

const mcu = sideHeader(-2.4, -1);
const lc = sideHeader(PCB_L, 1);

const soic = box(10.3, 7.5, 1.75).color(IC).translate(11.3, 6.2, PCB_T);
const pin1 = cylinder(0.2, 0.3, 16).color('#f0f0f8').translate(11.8, 6.7, PCB_T + 1.75);
const leads: Shape[] = [];
for (let i = 0; i < 8; i++) {
  const ly = 6.5 + i * 0.85;
  if (ly > 13.0) break;
  leads.push(box(0.85, 0.3, 0.15).color(CU).translate(10.45, ly, PCB_T + 0.15));
  leads.push(box(0.85, 0.3, 0.15).color(CU).translate(21.6, ly, PCB_T + 0.15));
}

const ratePads = box(3.0, 2.2, 0.22).color(CU).translate(5.0, 14.5, PCB_T);
const rateBridge = box(1.2, 0.6, 0.35).color('#333340').translate(5.9, 15.3, PCB_T + 0.22);

const caps: Shape[] = [
  box(2.0, 1.2, 0.6).color(PASS).translate(7.0, 3.5, PCB_T),
  box(2.0, 1.2, 0.6).color(PASS).translate(12.0, 3.5, PCB_T),
  box(2.0, 1.2, 0.6).color(PASS).translate(17.0, 3.5, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(24.0, 14.5, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(24.0, 16.5, PCB_T),
];

const asm = assembly('hx711');
asm.part('pcb', pcb);
asm.part('mcu-header', mcu.body);
mcu.pins.forEach((p, i) => asm.part(`mcu-pin-${i}`, p));
asm.part('lc-header', lc.body);
lc.pins.forEach((p, i) => asm.part(`lc-pin-${i}`, p));
asm.part('hx711-soic', soic);
asm.part('pin1-dot', pin1);
leads.forEach((l, i) => asm.part(`lead-${i}`, l));
asm.part('rate-pads', ratePads);
asm.part('rate-jumper', rateBridge);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
return asm.model();
