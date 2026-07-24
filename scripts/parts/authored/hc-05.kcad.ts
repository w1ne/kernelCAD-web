// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/hc-05.kcad.ts
//
// HC-05 Bluetooth SPP module (classic blue breadboard breakout).
// 37 × 16 mm carrier + 27 × 13 mm radio daughterboard with meander antenna.

const PCB_L = 37.0;
const PCB_W = 15.5;
const PCB_T = 1.6;

const CARRIER = '#1565c0';
const RADIO = '#0d1b2a';
const CU = '#c8a040';
const HDR = '#1a1a28';
const LED_R = '#ef4444';
const LED_B = '#3b82f6';
const ANT = '#94a3b8';

const carrier = box(PCB_L, PCB_W, PCB_T).color(CARRIER);

// 6-pin header (STATE RX TX GND KEY VCC)
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

// Radio daughter PCB (soldered on top)
const radio = box(27.0, 13.0, 0.9).color(RADIO).translate(8.0, 1.25, PCB_T);
// Shield can over RFIC
const can = box(10.0, 9.0, 1.8).color('#64748b').translate(10.0, 3.0, PCB_T + 0.9);
const canLid = box(9.4, 8.4, 0.25).color('#475569').translate(10.3, 3.3, PCB_T + 2.7);
// Crystal
const xtal = box(3.2, 2.5, 0.8).color('#a8aab0').translate(21.0, 4.0, PCB_T + 0.9);
// Meander / chip antenna pad area
const antPad = box(6.0, 10.0, 0.15).color(ANT).translate(28.5, 2.5, PCB_T + 0.9);
const antTrace = box(0.4, 8.0, 0.12).color(CU).translate(31.0, 3.5, PCB_T + 1.05);

// Button (EN/KEY)
const btn = box(3.0, 2.5, 1.2).color('#334155').translate(3.5, 6.0, PCB_T);
const btnTop = cylinder(0.4, 0.9, 16).color('#94a3b8').translate(5.0, 7.25, PCB_T + 1.2);

const ledState = box(1.6, 0.8, 0.5).color(LED_B).translate(3.5, 11.5, PCB_T);
const ledLink = box(1.6, 0.8, 0.5).color(LED_R).translate(5.5, 11.5, PCB_T);

const asm = assembly('hc-05');
asm.part('carrier-pcb', carrier);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('radio-pcb', radio);
asm.part('shield-can', can);
asm.part('shield-lid', canLid);
asm.part('crystal', xtal);
asm.part('antenna-pad', antPad);
asm.part('antenna-trace', antTrace);
asm.part('key-button', btn);
asm.part('key-cap', btnTop);
asm.part('led-state', ledState);
asm.part('led-link', ledLink);
return asm.model();
