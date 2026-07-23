// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/nrf24l01.kcad.ts
//
// nRF24L01+ 2.4 GHz transceiver breakout (8-pin SPI, PCB antenna).
// 15 × 29 mm black/green module with crystal + meander antenna.

const PCB_L = 15.0;
const PCB_W = 29.0;
const PCB_T = 1.0;

const PCB = '#0f172a';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';
const ANT = '#94a3b8';

const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB);

// 8-pin 2×4 header footprint on -Y (single row of 8 common clone)
const n = 8;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = (PCB_L - hdrW) / 2;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.0, 0.64).color(CU).translate(px, -7.0, PCB_T + 0.95));
}

// nRF24L01 QFN package
const qfn = box(4.0, 4.0, 0.9).color(IC).translate(5.5, 8.0, PCB_T);
const pin1 = cylinder(0.15, 0.2, 10).color('#f0f0f8').translate(5.75, 8.25, PCB_T + 0.9);

// 16 MHz crystal
const xtal = box(3.2, 2.5, 0.8).color('#a8aab0').translate(5.9, 13.5, PCB_T);

// PCB meander antenna on +Y end
const antBase = box(PCB_L - 2, 8.0, 0.12).color(ANT).translate(1.0, 19.5, PCB_T);
const meander: Shape[] = [];
for (let i = 0; i < 5; i++) {
  meander.push(box(0.35, 6.0, 0.15).color(CU).translate(2.5 + i * 2.2, 20.5, PCB_T + 0.12));
  if (i < 4) {
    meander.push(box(2.2, 0.35, 0.15).color(CU).translate(2.5 + i * 2.2, 20.5 + (i % 2 === 0 ? 5.65 : 0), PCB_T + 0.12));
  }
}

const caps: Shape[] = [
  box(1.0, 0.5, 0.4).color(PASS).translate(2.0, 6.0, PCB_T),
  box(1.0, 0.5, 0.4).color(PASS).translate(2.0, 8.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(11.0, 8.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(11.0, 11.0, PCB_T),
];

const asm = assembly('nrf24l01');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('nrf24-qfn', qfn);
asm.part('pin1-dot', pin1);
asm.part('crystal', xtal);
asm.part('antenna-ground', antBase);
meander.forEach((m, i) => asm.part(`meander-${i}`, m));
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
return asm.model();
