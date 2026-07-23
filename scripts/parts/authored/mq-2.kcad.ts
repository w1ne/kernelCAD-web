// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/mq-2.kcad.ts
//
// Hanwei MQ-2 smoke / LPG / CO gas sensor breakout.
// Same MQ family silhouette as MQ-6 with distinct board silk and pinout.

// cylinder(height, radius)

const PCB_L = 32.0;
const PCB_W = 20.0;
const PCB_T = 1.6;

const PCB = '#1f6b3a';
const CAN = '#b0b6c0';
const MESH = '#5a6068';
const CU = '#c8a040';
const IC = '#1a1a22';
const PASS = '#8a6a40';
const POT = '#2a2a32';
const HDR = '#1a1a28';

const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB);

const n = 4;
const pitch = 2.54;
const hdrH = (n - 1) * pitch + 2.4;
const hdrY = (PCB_W - hdrH) / 2;
const headerBody = box(2.4, hdrH, 2.5).color(HDR).translate(-2.4, hdrY, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const py = hdrY + 1.2 + i * pitch;
  pins.push(box(7.0, 0.64, 0.64).color(CU).translate(-7.0, py, PCB_T + 0.95));
}

// Heater can ∅16 × 17 tall
const canR = 8.0;
const canH = 17.0;
const cx = 20.0;
const cy = PCB_W / 2;
const can = cylinder(canH, canR, 48).color(CAN).translate(cx, cy, PCB_T);
const bands: Shape[] = [];
for (let i = 0; i < 6; i++) {
  bands.push(cylinder(0.55, canR + 0.2, 48).color(MESH).translate(cx, cy, PCB_T + 2.0 + i * 2.4));
}
const top = cylinder(0.9, canR - 0.5, 48).color(MESH).translate(cx, cy, PCB_T + canH);

const soic = box(5.0, 4.0, 1.5).color(IC).translate(3.5, 3.0, PCB_T);
const pot = cylinder(2.4, 2.2, 24).color(POT).translate(6.0, 13.0, PCB_T);
const potKnob = cylinder(0.5, 1.0, 16).color('#888890').translate(6.0, 13.0, PCB_T + 2.4);

const caps: Shape[] = [
  box(2.0, 1.2, 0.6).color(PASS).translate(9.5, 3.5, PCB_T),
  box(2.0, 1.2, 0.6).color(PASS).translate(9.5, 6.5, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(12.5, 3.5, PCB_T),
];

// Silk label bar (distinguish MQ-2)
const silk = box(8.0, 1.2, 0.08).color('#e8f5e9').translate(3.0, 17.5, PCB_T);

const asm = assembly('mq-2');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('heater-can', can);
bands.forEach((b, i) => asm.part(`mesh-${i}`, b));
asm.part('can-top', top);
asm.part('soic', soic);
asm.part('trim-pot', pot);
asm.part('trim-knob', potKnob);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
asm.part('silk-label', silk);
return asm.model();
