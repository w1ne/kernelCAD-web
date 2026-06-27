// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/pushbutton-6mm.kcad.ts
//
// 6mm tactile pushbutton (SMD/THT tact switch).
// Overall footprint: 6 x 6 x 5 mm (body 3.5mm + 1.5mm actuator cap on top).
// Four J-legs at corners; square dark-grey body; rounded cylindrical actuator cap.

const BTN_L = 6.0;
const BTN_W = 6.0;
const BTN_BODY_H = 3.5;
const BTN_CAP_H  = 1.5;

const BODY_GRAY = '#3a3a40';
const CAP_GRAY  = '#5a5a62';
const PIN_METAL = '#b8b8b0';

// Main body (6×6×3.5mm, square, dark grey)
const body = box(BTN_L, BTN_W, BTN_BODY_H).color(BODY_GRAY);

// Actuator cap (cylindrical, diameter ~3.5mm, height 1.5mm)
const cap = cylinder(BTN_CAP_H, 1.75, 32)
  .color(CAP_GRAY)
  .translate(BTN_L / 2, BTN_W / 2, BTN_BODY_H);

// Four J-legs at the corners, simplified as small flat metal pads that
// extend slightly beyond the body footprint.
const legs: Shape[] = [];
const padL = 1.5;
const padW = 0.8;
const padH = 0.3;
const cornerOffsets: [number, number][] = [
  [-padL + 0.2, 0.3],
  [BTN_L - 0.2, 0.3],
  [-padL + 0.2, BTN_W - padW - 0.3],
  [BTN_L - 0.2, BTN_W - padW - 0.3],
];
for (const [ox, oy] of cornerOffsets) {
  legs.push(box(padL, padW, padH).color(PIN_METAL).translate(ox, oy, 0));
}

const asm = assembly('pushbutton-6mm');
asm.part('body', body);
asm.part('cap', cap);
legs.forEach((l, i) => asm.part(`leg-${i}`, l));

return asm.model();
