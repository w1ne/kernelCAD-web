// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/ds3231.kcad.ts
//
// DS3231 precision RTC module with CR2032 backup (ZS-042 / AT24C32 class).
// 38 × 22 mm blue FR4; SOIC RTC; 32.768 kHz can crystal; coin-cell holder;
// optional EEPROM SOIC; 6-pin I²C header.

const PCB_L = 38.0;
const PCB_W = 22.0;
const PCB_T = 1.6;
const HOLE_R = 1.1;

const PCB = '#1a3a6e';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const STEEL = '#b8bcc4';
const CELL = '#d8dce0';
const XTAL = '#a8aab0';

const holes = [
  [2.2, 2.2],
  [PCB_L - 2.2, 2.2],
  [2.2, PCB_W - 2.2],
  [PCB_L - 2.2, PCB_W - 2.2],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

const n = 6;
const pitch = 2.54;
const hdrH = (n - 1) * pitch + 2.4;
const hdrY = (PCB_W - hdrH) / 2;
const headerBody = box(2.4, hdrH, 2.5).color(HDR).translate(-2.4, hdrY, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const py = hdrY + 1.2 + i * pitch;
  pins.push(box(7.5, 0.64, 0.64).color(CU).translate(-7.5, py, PCB_T + 0.95));
}

// DS3231 SOIC-16
const rtc = box(10.3, 7.5, 1.75).color(IC).translate(3.5, 7.2, PCB_T);
const pin1 = cylinder(0.2, 0.3, 16).color('#f0f0f8').translate(4.0, 7.7, PCB_T + 1.75);

// AT24C32 EEPROM SOIC-8
const eeprom = box(5.0, 4.0, 1.5).color(IC).translate(3.5, 2.5, PCB_T);

// HC-49/US crystal can
const xtal = box(10.5, 4.2, 3.5).color(XTAL).translate(15.0, 2.0, PCB_T);
const xtalTop = box(9.5, 3.4, 0.3).color('#909098').translate(15.5, 2.4, PCB_T + 3.5);

// CR2032 holder + cell (cylinder height, radius)
const hx = 28.5;
const hy = PCB_W / 2;
const holderBase = cylinder(0.6, 10.5, 48).color(STEEL).translate(hx, hy, PCB_T);
const holderWall = cylinder(3.2, 10.2, 48)
  .subtract(cylinder(3.4, 9.3, 48).translate(0, 0, -0.1))
  .color(STEEL)
  .translate(hx, hy, PCB_T + 0.5);
const cell = cylinder(2.8, 9.0, 48).color(CELL).translate(hx, hy, PCB_T + 0.7);
const clip = box(5.0, 2.2, 1.2).color(STEEL).translate(hx + 7.5, hy - 1.1, PCB_T + 2.8);

const caps: Shape[] = [
  box(1.6, 0.8, 0.5).color(PASS).translate(14.5, 12.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(14.5, 15.0, PCB_T),
  box(1.0, 0.5, 0.45).color(PASS).translate(9.0, 16.5, PCB_T),
];
const led = box(1.6, 0.8, 0.5).color('#fbbf24').translate(9.0, 18.5, PCB_T);

const asm = assembly('ds3231');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('ds3231-soic', rtc);
asm.part('pin1-dot', pin1);
asm.part('eeprom-soic', eeprom);
asm.part('crystal', xtal);
asm.part('crystal-lid', xtalTop);
asm.part('holder-base', holderBase);
asm.part('holder-wall', holderWall);
asm.part('cr2032', cell);
asm.part('holder-clip', clip);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
asm.part('pwr-led', led);
return asm.model();
