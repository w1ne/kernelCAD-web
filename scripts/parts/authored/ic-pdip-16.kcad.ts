// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/ic-pdip-16.kcad.ts
//
// PDIP-16 — 300-mil plastic dual in-line package, 16 leads.
//
// Covers l293d (body 19.80 x 6.35), 74hc595 (19.31 x 6.35) and sn74hc165
// (19.10 x 6.35): one package, three body lengths within half a millimetre, so
// a single model serves all three at catalog resolution.
//
// These parts were previously pointed at an 'ic-lqfp-48' mesh as a stand-in.
// That was wrong on every axis — shape (square flatpack vs rectangular DIP),
// size, and pin count (48 vs 16). TI's own datasheets list no LQFP variant of
// the L293D at all.
//
// Built as an assembly rather than one fused boolean on purpose: booleans drop
// leaf colors, and the catalog GLB build asserts >= 2 materials ("colors lost").
// Separate parts keep the black body and tin-plated leads distinguishable.

const BODY_L = 19.8; // JEDEC D, L293D; HC595 19.31 / HC165 19.10 within tolerance
const BODY_W = 6.35; // JEDEC E1, leads excluded
const BODY_H = 3.8; // JEDEC A, above the seating plane

// Lead frame fixed by the 300-mil standard — changing these would stop it being
// a PDIP-16, so they are constants rather than tunables.
const PITCH = 2.54;
const ROW_SPACING = 7.62;
const PINS_PER_SIDE = 8;
const STANDOFF = 3.3; // JEDEC A1: body underside above the board
const LEAD_W = 0.5;
const LEAD_T = 0.25;
const SHOULDER_INNER_Y = 2.5; // tucks under the body so the joint always overlaps

const BODY_BLACK = '#1c1c1f';
const LEAD_METAL = '#c8ccd0';

// Body, centred on the origin in X/Y and sitting on its standoff.
// The pin-1 end notch and dimple are cut here, before the part is coloured, so
// the indent reads as an indent rather than a separate black blob.
const notch = cylinder(BODY_H + 1, 1.0, 24).translate(-BODY_L / 2, 0, STANDOFF - 0.5);
const dimple = cylinder(1.2, 0.55, 20).translate(-BODY_L / 2 + 2.6, -1.7, STANDOFF + BODY_H - 0.5);

const body = box(BODY_L, BODY_W, BODY_H, true)
  .translate(0, 0, STANDOFF + BODY_H / 2)
  .subtract(notch)
  .subtract(dimple)
  .color(BODY_BLACK);

const asm = assembly('ic-pdip-16');
asm.part('body', body);

// Leads: a vertical run down to the board, plus a shoulder tucked into the body.
// A plain loop rather than patternLinear — the pattern API is boolean-union
// based, which is what we are specifically avoiding here.
const firstX = -((PINS_PER_SIDE - 1) * PITCH) / 2;
for (let i = 0; i < PINS_PER_SIDE; i++) {
  const x = firstX + i * PITCH;
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'a' : 'b';
    const lead = box(LEAD_W, LEAD_T, STANDOFF + 0.6, true)
      .translate(x, (side * ROW_SPACING) / 2, (STANDOFF + 0.6) / 2)
      .color(LEAD_METAL);
    const shoulder = box(LEAD_W, ROW_SPACING / 2 - SHOULDER_INNER_Y, LEAD_T, true)
      .translate(x, side * (ROW_SPACING / 4 + SHOULDER_INNER_Y / 2), STANDOFF + 0.5)
      .color(LEAD_METAL);
    asm.part(`lead-${tag}${i + 1}`, lead);
    asm.part(`shoulder-${tag}${i + 1}`, shoulder);
  }
}

return asm.model();
