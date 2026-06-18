// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// MUSE 'business_card_holder' — desktop stand with a backward-tilted card
// slot. Single solid: rectangular base block minus a tilted slot volume.
// Envelope ~104 x 20 x 25 mm; slot tilted back 15 degrees, open at the top,
// floor kept solid so the part stays one closed body.

const SLOT_LEN = 94;        // 2 * card_length (47)
const SLOT_W = 8;           // 2 * card_width (4)
const CARD_H = 25;          // card_height — vertical depth of the slot
const OFF_BACK = 6;         // stand_offset_back_width
const OFF_FRONT = 10;       // stand_offset_front_width (front of slot — viewer side)
const OFF_LEN = 5;          // stand_offset_length (margin each side)
const TILT = 15;            // degrees, backward tilt
const FLOOR = 3;            // solid floor under the slot (keeps one closed solid)

const baseLen = SLOT_LEN + 2 * OFF_LEN;          // 104
const baseDepth = OFF_FRONT + SLOT_W + OFF_BACK; // 24
const baseH = CARD_H;                            // 25

const base = box(baseLen, baseDepth, baseH, true).translate(0, 0, baseH / 2);

// Slot: a card-stack volume, rotated back around the X axis, sunk to leave a
// solid floor. Tall enough to cut cleanly through the tilted top opening.
const slotCenterY = -baseDepth / 2 + OFF_FRONT + SLOT_W / 2;
const slot = box(SLOT_LEN, SLOT_W, baseH + 20, true)
  .translate(0, 0, (baseH + 20) / 2 + FLOOR)
  .rotate([1, 0, 0], -TILT, [0, 0, FLOOR])
  .translate(0, slotCenterY, 0);

return base.subtract(slot).color('plate');
