// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/l298n.kcad.ts
//
// L298N dual H-bridge motor driver module (classic red board + heatsink).
// 43 × 43 mm; large aluminum heatsink; screw terminals; enable jumpers.

const PCB_L = 43.0;
const PCB_W = 43.0;
const PCB_T = 1.6;
const HOLE_R = 1.5;

const PCB = '#b91c1c';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const HS = '#9ca3af';
const TERM = '#2a2a32';
const JUMP = '#1e3a5f';

const holes = [
  [3.5, 3.5],
  [PCB_L - 3.5, 3.5],
  [3.5, PCB_W - 3.5],
  [PCB_L - 3.5, PCB_W - 3.5],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// L298N Multiwatt package under heatsink
const l298 = box(20.0, 10.0, 4.5).color(IC).translate(11.5, 16.0, PCB_T);

// Aluminum heatsink with fins
const hsBase = box(25.0, 16.0, 2.0).color(HS).translate(9.0, 13.5, PCB_T + 4.5);
const fins: Shape[] = [];
for (let i = 0; i < 8; i++) {
  fins.push(box(25.0, 1.0, 10.0).color(HS).translate(9.0, 13.8 + i * 1.85, PCB_T + 6.5));
}

// Power screw terminals (VS, GND, VSS) — 3-pos
const pwrTerm = box(15.0, 8.0, 10.0).color(TERM).translate(2.0, 32.0, PCB_T);
// Motor A screw terminal 2-pos
const motA = box(10.0, 8.0, 10.0).color(TERM).translate(2.0, 2.0, PCB_T);
// Motor B screw terminal 2-pos
const motB = box(10.0, 8.0, 10.0).color(TERM).translate(31.0, 2.0, PCB_T);

// Logic header (IN1-4, ENA, ENB) on +X
const n = 6;
const pitch = 2.54;
const hdrH = (n - 1) * pitch + 2.4;
const hdrY = (PCB_W - hdrH) / 2;
const headerBody = box(2.4, hdrH, 2.5).color(HDR).translate(PCB_L, hdrY, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const py = hdrY + 1.2 + i * pitch;
  pins.push(box(7.0, 0.64, 0.64).color(CU).translate(PCB_L + 0.5, py, PCB_T + 0.95));
}

// ENA/ENB jumper blocks
const j1 = box(5.0, 2.5, 2.0).color(JUMP).translate(20.0, 33.0, PCB_T);
const j2 = box(5.0, 2.5, 2.0).color(JUMP).translate(27.0, 33.0, PCB_T);

// Electrolytic caps
const cap1 = cylinder(8.0, 4.0, 28).color('#1e293b').translate(34.0, 28.0, PCB_T);
const cap2 = cylinder(6.0, 3.0, 24).color('#1e293b').translate(34.0, 18.0, PCB_T);

const led = box(1.6, 0.8, 0.5).color('#22c55e').translate(20.0, 38.0, PCB_T);

const asm = assembly('l298n');
asm.part('pcb', pcb);
asm.part('l298n-ic', l298);
asm.part('heatsink-base', hsBase);
fins.forEach((f, i) => asm.part(`fin-${i}`, f));
asm.part('power-terminal', pwrTerm);
asm.part('motor-a-terminal', motA);
asm.part('motor-b-terminal', motB);
asm.part('logic-header', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('ena-jumper', j1);
asm.part('enb-jumper', j2);
asm.part('cap-large', cap1);
asm.part('cap-mid', cap2);
asm.part('pwr-led', led);
return asm.model();
