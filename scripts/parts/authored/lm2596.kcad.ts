// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/lm2596.kcad.ts
//
// LM2596 adjustable buck converter module (blue board, classic layout).
// 43 × 21 mm; large inductor; multi-turn pot; two electrolytics; IN/OUT pads.

const PCB_L = 43.0;
const PCB_W = 21.0;
const PCB_T = 1.6;
const HOLE_R = 1.1;

const PCB = '#1e3a8a';
const IC = '#1a1a22';
const CU = '#c8a040';
const IND = '#1a1a22';
const IND_TOP = '#334155';
const CAP = '#1e293b';
const CAP_TOP = '#94a3b8';
const POT = '#0f172a';
const DIODE = '#1a1a22';

const holes = [
  [2.5, 2.5],
  [PCB_L - 2.5, 2.5],
  [2.5, PCB_W - 2.5],
  [PCB_L - 2.5, PCB_W - 2.5],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// LM2596 TO-263 / TO-220 style package
const reg = box(10.0, 9.0, 4.5).color(IC).translate(8.0, 6.0, PCB_T);
const tab = box(10.0, 1.5, 8.0).color('#9ca3af').translate(8.0, 15.0, PCB_T);

// Power inductor (shielded drum)
const ind = cylinder(7.0, 5.5, 36).color(IND).translate(26.0, 10.5, PCB_T);
const indTop = cylinder(0.8, 5.0, 36).color(IND_TOP).translate(26.0, 10.5, PCB_T + 7.0);

// Multi-turn trim pot for Vout
const pot = box(5.0, 5.0, 4.5).color(POT).translate(18.0, 3.0, PCB_T);
const potScrew = cylinder(0.8, 1.2, 16).color('#c0c4cc').translate(20.5, 5.5, PCB_T + 4.5);

// Input / output electrolytics
const cin = cylinder(10.0, 4.0, 28).color(CAP).translate(5.0, 10.5, PCB_T);
const cinTop = cylinder(0.4, 3.5, 24).color(CAP_TOP).translate(5.0, 10.5, PCB_T + 10.0);
const cout = cylinder(10.0, 4.0, 28).color(CAP).translate(35.0, 10.5, PCB_T);
const coutTop = cylinder(0.4, 3.5, 24).color(CAP_TOP).translate(35.0, 10.5, PCB_T + 10.0);

// Schottky diode
const diode = box(5.0, 2.5, 2.2).color(DIODE).translate(18.0, 12.0, PCB_T);
const diodeBand = box(0.6, 2.5, 2.2).color('#c8a040').translate(22.0, 12.0, PCB_T);

// IN+/IN− OUT+/OUT− pads
const pads: Shape[] = [
  box(3.0, 3.0, 0.25).color(CU).translate(1.5, 1.5, PCB_T),
  box(3.0, 3.0, 0.25).color(CU).translate(1.5, 16.5, PCB_T),
  box(3.0, 3.0, 0.25).color(CU).translate(38.5, 1.5, PCB_T),
  box(3.0, 3.0, 0.25).color(CU).translate(38.5, 16.5, PCB_T),
];

const led = box(1.6, 0.8, 0.5).color('#22c55e').translate(14.0, 17.5, PCB_T);

const asm = assembly('lm2596');
asm.part('pcb', pcb);
asm.part('lm2596-reg', reg);
asm.part('reg-tab', tab);
asm.part('inductor', ind);
asm.part('inductor-top', indTop);
asm.part('trim-pot', pot);
asm.part('pot-screw', potScrew);
asm.part('cap-in', cin);
asm.part('cap-in-top', cinTop);
asm.part('cap-out', cout);
asm.part('cap-out-top', coutTop);
asm.part('schottky', diode);
asm.part('diode-band', diodeBand);
pads.forEach((p, i) => asm.part(`pad-${i}`, p));
asm.part('pwr-led', led);
return asm.model();
