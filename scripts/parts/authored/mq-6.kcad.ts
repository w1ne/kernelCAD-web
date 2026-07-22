// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/mq-6.kcad.ts
//
// Hanwei MQ-6 LPG / propane gas sensor breakout module.
// Overall footprint: 32 x 22 x 20 mm (heater can dominates Z).
// Layout: green FR4 slab; 4-pin 2.54mm header on the long edge; large
// metal mesh heater can (the iconic MQ family silhouette) centered;
// small dual-op-amp SOIC and trim pot on the free half of the board.

const PCB_L = 32.0; // X
const PCB_W = 22.0; // Y
const PCB_T = 1.6;

const PCB_GREEN = '#1f6b3a';
const CAN_METAL = '#a8aeb8';
const CAN_MESH  = '#6a7078';
const GOLD      = '#c8a040';
const IC_DARK   = '#222228';
const PASSIVE   = '#7a6040';
const POT_BODY  = '#2a2a32';

// PCB slab
const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB_GREEN);

// 4-pin header (VCC GND AOUT DOUT) on the -X short edge
const pinCount = 4;
const pinPitch = 2.54;
const headerH = (pinCount - 1) * pinPitch + 2.5;
const headerY = (PCB_W - headerH) / 2;
const headerBody = box(2.5, headerH, 2.5).color('#1a1a28').translate(-2.5, headerY, PCB_T);
const headerPins: Shape[] = [];
for (let i = 0; i < pinCount; i++) {
  const py = headerY + 1.25 + i * pinPitch;
  headerPins.push(
    box(6.0, 0.6, 0.6).color(GOLD).translate(-6.0, py, PCB_T + 0.9),
  );
}

// Heater can — the MQ family's signature look (approx ∅16 × 16 mm tall)
const canR = 8.0;
const canH = 16.0;
const canX = 20.0;
const canY = PCB_W / 2;
const can = cylinder(canR, canH, 48)
  .color(CAN_METAL)
  .translate(canX, canY, PCB_T);
// Mesh bands around the can (stacked rings as thin discs on the side look)
const meshBands: Shape[] = [];
for (let i = 0; i < 5; i++) {
  const z = PCB_T + 2.0 + i * 2.6;
  meshBands.push(
    cylinder(canR + 0.15, 0.6, 48).color(CAN_MESH).translate(canX, canY, z),
  );
}
// Can top cap
const canTop = cylinder(canR - 0.4, 0.8, 48)
  .color(CAN_MESH)
  .translate(canX, canY, PCB_T + canH);

// Dual op-amp SOIC-8 near the header side
const soic = box(5.0, 4.0, 1.5).color(IC_DARK).translate(4.0, 3.0, PCB_T);
// Pin-1 mark
const pin1 = cylinder(0.3, 0.2, 16).color('#e0e0e8').translate(4.6, 3.6, PCB_T + 1.5);

// Trim pot for DOUT threshold
const pot = cylinder(2.2, 2.5, 24).color(POT_BODY).translate(6.0, 14.0, PCB_T);
const potKnob = cylinder(1.0, 0.6, 16).color('#888890').translate(6.0, 14.0, PCB_T + 2.5);

// A few 0805 passives
const caps: Shape[] = [];
for (const [cx, cy] of [[10.0, 4.0], [10.0, 6.5], [12.5, 4.0]] as [number, number][]) {
  caps.push(box(2.0, 1.2, 0.6).color(PASSIVE).translate(cx, cy, PCB_T));
}

const asm = assembly('mq-6');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
headerPins.forEach((p, i) => asm.part(`header-pin-${i}`, p));
asm.part('heater-can', can);
meshBands.forEach((b, i) => asm.part(`mesh-band-${i}`, b));
asm.part('can-top', canTop);
asm.part('soic', soic);
asm.part('pin1', pin1);
asm.part('trim-pot', pot);
asm.part('trim-knob', potKnob);
caps.forEach((c, i) => asm.part(`cap-${i}`, c));

return asm.model();
