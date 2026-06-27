// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/ws2812-strip.kcad.ts
//
// WS2812B NeoPixel LED strip segment (3 pixels).
// Overall footprint: 17 x 10 x 3 mm.
// Layout: dark PCB strip; three WS2812B packages (5×5×1.7mm) evenly spaced;
// copper pads visible at both ends for daisy-chain wiring; 4 solder tabs each.

const STRIP_L = 17.0;
const STRIP_W = 10.0;
const STRIP_T = 1.6;

const PCB_GREEN = '#1a3020';
const COPPER    = '#b8763a';
const LED_LENS  = '#dde8dd';  // diffused white lens

// PCB strip
const pcb = box(STRIP_L, STRIP_W, STRIP_T).color(PCB_GREEN);

// Three WS2812B LED packages, 5×5×1.7mm, evenly spaced
const ledCount = 3;
const ledL = 5.0;
const ledW = 5.0;
const ledT = 1.7;

const leds: Shape[] = [];
const lenses: Shape[] = [];
for (let i = 0; i < ledCount; i++) {
  const lx = i === 0 ? 0 : i === 1 ? (STRIP_L - ledL) / 2 : STRIP_L - ledL;
  const ly = (STRIP_W - ledW) / 2;
  // LED package body (black epoxy)
  leds.push(
    box(ledL, ledW, ledT)
      .color('#101010')
      .translate(lx, ly, STRIP_T),
  );
  // Diffused lens window (center, slightly recessed)
  lenses.push(
    box(3.5, 3.5, 0.3)
      .color(LED_LENS)
      .translate(lx + (ledL - 3.5) / 2, ly + (ledW - 3.5) / 2, STRIP_T + ledT - 0.2),
  );
}

// Copper connection pads at each end of the strip (4 pads per end)
const pads: Shape[] = [];
const padPositions = [0.4, 0.5 + 2.0, 0.5 + 4.0, 0.5 + 6.0]; // Y positions
for (const py of padPositions) {
  // left end
  pads.push(box(2.0, 1.2, 0.1).color(COPPER).translate(-1.5, py, STRIP_T));
  // right end
  pads.push(box(2.0, 1.2, 0.1).color(COPPER).translate(STRIP_L - 0.5, py, STRIP_T));
}

const asm = assembly('ws2812-strip');
asm.part('pcb', pcb);
leds.forEach((l, i) => asm.part(`led-${i}`, l));
lenses.forEach((l, i) => asm.part(`lens-${i}`, l));
pads.forEach((p, i) => asm.part(`pad-${i}`, p));

return asm.model();
