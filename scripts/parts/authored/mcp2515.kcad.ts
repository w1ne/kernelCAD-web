// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/mcp2515.kcad.ts
//
// MCP2515 + TJA1050 CAN bus module (common green SPI breakout).
// 40 × 28 mm; crystal; SPI header; CAN H/L screw-style pads; 120 Ω jumper.

const PCB_L = 40.0;
const PCB_W = 28.0;
const PCB_T = 1.6;
const HOLE_R = 1.1;

const PCB = '#1a6b3a';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const TERM = '#2a2a32';
const XTAL = '#a8aab0';

const holes = [
  [2.5, 2.5],
  [PCB_L - 2.5, 2.5],
  [2.5, PCB_W - 2.5],
  [PCB_L - 2.5, PCB_W - 2.5],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// SPI + power 8-pin header on -Y
const n = 8;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = (PCB_L - hdrW) / 2;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.5, 0.64).color(CU).translate(px, -7.5, PCB_T + 0.95));
}

// MCP2515 SOIC-18-ish
const mcp = box(11.5, 7.5, 1.75).color(IC).translate(5.0, 8.0, PCB_T);
const pin1 = cylinder(0.2, 0.28, 14).color('#f0f0f8').translate(5.5, 8.5, PCB_T + 1.75);

// TJA1050 SOIC-8
const tja = box(5.0, 4.0, 1.5).color(IC).translate(20.0, 9.0, PCB_T);

// Crystal
const xtal = box(10.5, 4.2, 3.2).color(XTAL).translate(5.0, 17.5, PCB_T);

// Screw terminal block for CANH / CANL (2-pos)
const termBody = box(10.0, 7.5, 8.5).color(TERM).translate(26.0, 18.0, PCB_T);
const termMetal1 = box(2.2, 2.2, 1.0).color(CU).translate(27.5, 19.5, PCB_T + 8.5);
const termMetal2 = box(2.2, 2.2, 1.0).color(CU).translate(32.5, 19.5, PCB_T + 8.5);

// 120 Ω terminator jumper
const jmp = box(3.0, 2.2, 0.25).color(CU).translate(26.0, 8.0, PCB_T);
const jmpCap = box(1.4, 0.7, 0.4).color('#334155').translate(26.8, 8.7, PCB_T + 0.25);

const caps: Shape[] = [
  box(2.0, 1.2, 0.6).color(PASS).translate(18.0, 18.0, PCB_T),
  box(2.0, 1.2, 0.6).color(PASS).translate(18.0, 21.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(28.0, 5.0, PCB_T),
];
const led = box(1.6, 0.8, 0.5).color('#22c55e').translate(32.0, 5.0, PCB_T);

const asm = assembly('mcp2515');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('mcp2515-soic', mcp);
asm.part('pin1-dot', pin1);
asm.part('tja1050-soic', tja);
asm.part('crystal', xtal);
asm.part('can-terminal', termBody);
asm.part('canh-screw', termMetal1);
asm.part('canl-screw', termMetal2);
asm.part('term-jumper-pads', jmp);
asm.part('term-jumper', jmpCap);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
asm.part('pwr-led', led);
return asm.model();
