// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/ina219.kcad.ts
//
// INA219 high-side DC current sensor breakout (Adafruit #904 / generic class).
// Form factor: 25.4 × 20.3 × ~5 mm with 6-pin 2.54 mm header.
// Distinctive: blue FR4, SOIC-8 INA219, 0.1 Ω sense shunt bar, VIN+/− pads.

// cylinder(height, radius) — kernelCAD convention.

const PCB_L = 25.4;
const PCB_W = 20.3;
const PCB_T = 1.6;
const HOLE_R = 1.05; // M2.5 mounting

const PCB = '#1a3a6e';
const SILK = '#e8eef8';
const IC = '#1a1a22';
const CU = '#c8a040';
const SHUNT = '#2c2c34';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const LED_G = '#22c55e';

// Corner mounting holes
const holes = [
  [2.0, 2.0],
  [PCB_L - 2.0, 2.0],
  [2.0, PCB_W - 2.0],
  [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 28).translate(x, y, -1));

const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// 6-pin right-angle style header on -X (pins stick out for breadboard)
const n = 6;
const pitch = 2.54;
const hdrH = (n - 1) * pitch + 2.4;
const hdrY = (PCB_W - hdrH) / 2;
const headerBody = box(2.4, hdrH, 2.5).color(HDR).translate(-2.4, hdrY, PCB_T);
const pins: Shape[] = [];
const pinBoxes: Shape[] = [];
for (let i = 0; i < n; i++) {
  const py = hdrY + 1.2 + i * pitch;
  pins.push(box(7.5, 0.64, 0.64).color(CU).translate(-7.5, py, PCB_T + 0.95));
  // solder fillet stubs on board
  pinBoxes.push(box(1.2, 1.2, 0.15).color(CU).translate(0.2, py - 0.3, PCB_T));
}

// INA219 SOIC-8 with lead stubs
const icX = 9.0;
const icY = 8.2;
const soic = box(4.9, 3.9, 1.55).color(IC).translate(icX, icY, PCB_T);
const pin1 = cylinder(0.2, 0.28, 16).color('#f0f0f8').translate(icX + 0.55, icY + 0.55, PCB_T + 1.55);
const leads: Shape[] = [];
for (let i = 0; i < 4; i++) {
  const ly = icY + 0.45 + i * 1.0;
  leads.push(box(0.9, 0.35, 0.2).color(CU).translate(icX - 0.9, ly, PCB_T + 0.2));
  leads.push(box(0.9, 0.35, 0.2).color(CU).translate(icX + 4.9, ly, PCB_T + 0.2));
}

// 0.1 Ω shunt (thick current path)
const shunt = box(3.4, 1.8, 0.85).color(SHUNT).translate(17.5, 9.2, PCB_T);
const shuntMark = box(3.0, 0.25, 0.1).color('#666670').translate(17.7, 9.95, PCB_T + 0.85);

// High-current terminal pads
const padPlus = box(3.2, 3.2, 0.25).color(CU).translate(19.5, 2.5, PCB_T);
const padMinus = box(3.2, 3.2, 0.25).color(CU).translate(19.5, 14.6, PCB_T);

// Power LED + 0402s
const led = box(1.6, 0.8, 0.55).color(LED_G).translate(5.5, 16.5, PCB_T);
const caps: Shape[] = [
  box(1.0, 0.5, 0.45).color(PASS).translate(5.5, 4.0, PCB_T),
  box(1.0, 0.5, 0.45).color(PASS).translate(7.0, 4.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(14.0, 4.5, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(14.0, 15.0, PCB_T),
];

// Silkscreen bar (visual brand strip)
const silk = box(PCB_L - 4, 0.4, 0.05).color(SILK).translate(2.0, PCB_W - 1.2, PCB_T);

const asm = assembly('ina219');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`header-pin-${i}`, p));
pinBoxes.forEach((p, i) => asm.part(`solder-pad-${i}`, p));
asm.part('ina219-soic', soic);
asm.part('pin1-dot', pin1);
leads.forEach((l, i) => asm.part(`soic-lead-${i}`, l));
asm.part('shunt', shunt);
asm.part('shunt-mark', shuntMark);
asm.part('pad-vin-plus', padPlus);
asm.part('pad-vin-minus', padMinus);
asm.part('pwr-led', led);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
asm.part('silk-bar', silk);

return asm.model();
