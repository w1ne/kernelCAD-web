// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/irf520.kcad.ts
//
// IRF520 MOSFET driver module (green breakout, TO-220 FET, screw terminals).
// 33 × 24 mm; SIG/VCC/GND header; load screw terminals; TO-220 tab.

const PCB_L = 33.0;
const PCB_W = 24.0;
const PCB_T = 1.6;
const HOLE_R = 1.1;

const PCB = '#1a6b3a';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const TERM = '#2a2a32';
const TAB = '#9ca3af';
const PASS = '#8a6a40';
const LED = '#22c55e';

const holes = [
  [2.5, 2.5],
  [PCB_L - 2.5, 2.5],
  [2.5, PCB_W - 2.5],
  [PCB_L - 2.5, PCB_W - 2.5],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// 3-pin logic header
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

// TO-220 body + metal tab
const to220 = box(10.0, 4.5, 8.5).color(IC).translate(11.5, 8.0, PCB_T);
const tab = box(10.0, 1.2, 12.0).color(TAB).translate(11.5, 12.5, PCB_T);
const tabHole = cylinder(1.5, 1.6, 20).color(TAB).translate(16.5, 13.1, PCB_T + 8.0);
// TO-220 leads
const leads: Shape[] = [];
for (let i = 0; i < 3; i++) {
  leads.push(box(0.7, 4.0, 0.5).color(CU).translate(12.5 + i * 2.8, 4.0, PCB_T + 0.5));
}

// Dual screw terminal (VIN / load)
const term = box(14.0, 8.0, 10.0).color(TERM).translate(9.5, 15.0, PCB_T);
const screw1 = box(2.2, 2.2, 1.0).color(CU).translate(12.0, 17.0, PCB_T + 10.0);
const screw2 = box(2.2, 2.2, 1.0).color(CU).translate(18.5, 17.0, PCB_T + 10.0);

const led = box(1.6, 0.8, 0.5).color(LED).translate(3.0, 10.0, PCB_T);
const r1 = box(2.0, 1.2, 0.6).color(PASS).translate(3.0, 6.0, PCB_T);

const asm = assembly('irf520');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('to220-body', to220);
asm.part('to220-tab', tab);
asm.part('tab-hole-boss', tabHole);
leads.forEach((l, i) => asm.part(`to220-lead-${i}`, l));
asm.part('load-terminal', term);
asm.part('screw-a', screw1);
asm.part('screw-b', screw2);
asm.part('status-led', led);
asm.part('gate-resistor', r1);
return asm.model();
