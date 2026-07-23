// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/relay-4ch.kcad.ts
//
// 4-channel 5V relay module with optoisolation (blue Songle-class relays).
// 75 × 55 mm; IN1–4 header; VCC/GND/JD-VCC; 3-pos screw terminals per channel.

const PCB_L = 75.0;
const PCB_W = 55.0;
const PCB_T = 1.6;
const HOLE_R = 1.5;

const PCB = '#1a1a22';
const RELAY_BLUE = '#1d4ed8';
const RELAY_TOP = '#2563eb';
const CU = '#c8a040';
const HDR = '#1a1a28';
const TERM = '#2a2a32';
const OPTO = '#1a1a22';
const LED = '#ef4444';

const holes = [
  [3.5, 3.5],
  [PCB_L - 3.5, 3.5],
  [3.5, PCB_W - 3.5],
  [PCB_L - 3.5, PCB_W - 3.5],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 24).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

// Control header IN1-4 + GND/VCC (6-pin)
const n = 6;
const pitch = 2.54;
const hdrW = (n - 1) * pitch + 2.4;
const hdrX = 4.0;
const headerBody = box(hdrW, 2.4, 2.5).color(HDR).translate(hdrX, -2.4, PCB_T);
const pins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const px = hdrX + 1.2 + i * pitch;
  pins.push(box(0.64, 7.0, 0.64).color(CU).translate(px, -7.0, PCB_T + 0.95));
}

// JD-VCC jumper block
const jd = box(5.0, 2.5, 2.0).color('#1e3a5f').translate(25.0, 2.0, PCB_T);

const relays: Shape[] = [];
const tops: Shape[] = [];
const terms: Shape[] = [];
const optos: Shape[] = [];
const leds: Shape[] = [];
for (let ch = 0; ch < 4; ch++) {
  const x = 4.0 + ch * 18.0;
  // Songle SRD-class envelope ~19×15×15
  relays.push(box(15.5, 19.0, 15.0).color(RELAY_BLUE).translate(x, 18.0, PCB_T));
  tops.push(box(14.5, 18.0, 0.8).color(RELAY_TOP).translate(x + 0.5, 18.5, PCB_T + 15.0));
  // 3-pos screw terminal (NO COM NC)
  terms.push(box(15.0, 10.0, 10.0).color(TERM).translate(x, 40.0, PCB_T));
  // Optocoupler SOIC-ish
  optos.push(box(5.0, 4.0, 1.5).color(OPTO).translate(x + 5.0, 8.0, PCB_T));
  leds.push(box(1.6, 0.8, 0.5).color(LED).translate(x + 2.0, 13.0, PCB_T));
}

const asm = assembly('relay-4ch');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('jd-vcc-jumper', jd);
relays.forEach((r, i) => asm.part(`relay-${i}`, r));
tops.forEach((t, i) => asm.part(`relay-top-${i}`, t));
terms.forEach((t, i) => asm.part(`terminal-${i}`, t));
optos.forEach((o, i) => asm.part(`opto-${i}`, o));
leds.forEach((l, i) => asm.part(`ch-led-${i}`, l));
return asm.model();
