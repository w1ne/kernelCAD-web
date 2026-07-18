// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/keyswitch-mx.kcad.ts
//
// Cherry MX-compatible mechanical keyswitch (MX1A series), PCB-mount ("5-pin")
// with the cross stem. Shown in MX Red colouring; the body geometry is common
// to the whole MX1A family.
//
// DIMENSION SOURCES
//   Cherry MX1A datasheet : https://www.maltron.com/uploads/6/1/2/5/61250099/mx1a_11nn_data_sheet.pdf
//   Cherry MX Series (SparkFun copy) : https://cdn.sparkfun.com/datasheets/Components/Switches/MX%20Series.pdf
//
//   Plate cutout        0.551 +/-0.002 in = 14.00 +/-0.05 mm SQUARE,
//                       corner R 0.30 mm max            CONFIRMED (MX1A p.5)
//                       -- the famous 14 mm figure is real and exact.
//   Plate thickness     0.06 +/-0.006 in = 1.52 +/-0.15 mm   CONFIRMED (p.5)
//   Lower housing       0.61 x 0.61 in = 15.6 x 15.6 mm      CONFIRMED (p.1)
//   Total height,
//     PCB -> stem top   0.60 in = 15.2 mm  (= 11.6 + 3.6)    CONFIRMED (p.1)
//   Housing height      0.46 in = 11.6 mm                    CONFIRMED (p.1)
//   Lower-housing skirt 0.20 in = 5.0 mm                     CONFIRMED (p.1)
//   Stem above housing  0.14 in = 3.6 mm                     CONFIRMED (p.1)
//   Height above plate  0.197 +0.012 in = 5.00 +0.30 mm      CONFIRMED (p.2)
//   Pin length below    0.13 in = 3.30 mm                    CONFIRMED (p.1)
//   Total travel        0.16 in = 4.06 mm                    CONFIRMED (p.4)
//   Pretravel           0.08 in = 2.03 mm (linear)           CONFIRMED (p.4)
//
//   FOOTPRINT (datasheet grid, 0.05 in = 1.27 mm spacing, origin = centre post):
//     central post      (0, 0),          hole dia 3.99 mm    CONFIRMED
//     contact pin 1     (-3.81, +2.54),  hole dia 1.50 mm    CONFIRMED
//     contact pin 2     (+2.54, +5.08),  hole dia 1.50 mm    CONFIRMED
//     fixation legs 2x  (+/-5.08, 0),    hole dia 1.70 mm    CONFIRMED
//     optional LED holes below centre,   hole dia 0.99 mm    CONFIRMED
//   Note the two contact pins are ASYMMETRIC — that is correct, not a typo.
//
// EXPLICITLY UNVERIFIED (do not treat as spec):
//   - UPPER HOUSING dimensions are never dimensioned on any official Cherry
//     drawing. Taken as 13.9 mm square, bounded above by the CONFIRMED 14.00 mm
//     plate cutout it must pass through. INFERRED.
//   - The datasheet gives PCB HOLE diameters, not the plastic post/leg
//     diameters. Post modelled at 3.85 and legs at 1.60, i.e. the confirmed
//     holes less a nominal clearance. INFERRED.
//   - CROSS STEM GEOMETRY IS NOT IN ANY CHERRY DRAWING. The widely circulated
//     "4.1 x 1.17 mm" is the KEYCAP SLOT (female) spec from Cherry's keycap
//     documentation, NOT the male stem. The stem here is modelled at
//     3.95 x 1.05 mm, which matches community caliper measurements
//     (~3.93-3.98 span, ~1.03-1.09 arms). Treat the stem cross-section as an
//     ESTIMATE. Its HEIGHT (3.6 mm above the housing) is confirmed.
//     If you are modelling a KEYCAP socket instead, use 4.1 x 1.17.

const LOWER = 15.6; // CONFIRMED
const UPPER_INFERRED = 13.9; // see note — bounded by the 14.00 plate cutout
const SKIRT_H = 5.0; // CONFIRMED, lower housing below the plate
const HOUSING_H = 11.6; // CONFIRMED, PCB -> top of upper housing
const STEM_TOP = 15.2; // CONFIRMED, PCB -> stem top
const STEM_H = STEM_TOP - HOUSING_H; // 3.6, CONFIRMED
const PIN_BELOW = 3.3; // CONFIRMED

const STEM_SPAN = 3.95; // ESTIMATE — not in any Cherry drawing
const STEM_ARM = 1.05; // ESTIMATE

const POST_DIA_INFERRED = 3.85; // from the CONFIRMED 3.99 hole, less clearance
const LEG_DIA_INFERRED = 1.6; // from the CONFIRMED 1.70 hole, less clearance
const CONTACT_DIA = 1.4; // mates the CONFIRMED 1.50 hole

const HOUSING_BLACK = '#232329';
const UPPER_GREY = '#43434c';
const STEM_RED = '#c0392b';
const PIN_METAL = '#c9a55a';
const POST_WHITE = '#d8d8d2';

// Origin = the central post, matching the datasheet's own grid origin.
// z = 0 is the PCB surface.

// --- Lower housing: 15.6 sq, PCB -> 5.0 ------------------------------------
const lower = box(LOWER, LOWER, SKIRT_H).color(HOUSING_BLACK).translate(-LOWER / 2, -LOWER / 2, 0);

// --- Upper housing: passes through the 14.00mm plate cutout, 5.0 -> 11.6 ---
const upper = box(UPPER_INFERRED, UPPER_INFERRED, HOUSING_H - SKIRT_H)
  .color(UPPER_GREY)
  .translate(-UPPER_INFERRED / 2, -UPPER_INFERRED / 2, SKIRT_H);

// --- Cross ("+") stem, 11.6 -> 15.2 ----------------------------------------
// Two crossing bars rising directly off the upper housing's top face. There is
// deliberately no pedestal: the real switch's stem emerges through a recess in
// the upper housing, and a pedestal block would interpenetrate that housing.
const stemBarX = box(STEM_SPAN, STEM_ARM, STEM_H)
  .color(STEM_RED)
  .translate(-STEM_SPAN / 2, -STEM_ARM / 2, HOUSING_H);
const stemBarY = box(STEM_ARM, STEM_SPAN, STEM_H)
  .color(STEM_RED)
  .translate(-STEM_ARM / 2, -STEM_SPAN / 2, HOUSING_H);

// --- Central plastic post (0,0), below the PCB ------------------------------
const post = cylinder(PIN_BELOW, POST_DIA_INFERRED / 2, 32)
  .color(POST_WHITE)
  .translate(0, 0, -PIN_BELOW);

// --- Two metal contact pins, at the CONFIRMED asymmetric positions ---------
const contacts: Shape[] = [];
const contactPositions: [number, number][] = [
  [-3.81, 2.54],
  [2.54, 5.08],
];
for (const [cx, cy] of contactPositions) {
  contacts.push(
    cylinder(PIN_BELOW + 1.0, CONTACT_DIA / 2, 16).color(PIN_METAL).translate(cx, cy, -PIN_BELOW),
  );
}

// --- Two plastic fixation legs at (+/-5.08, 0) ------------------------------
const legs: Shape[] = [];
for (const lx of [-5.08, 5.08]) {
  legs.push(
    cylinder(PIN_BELOW, LEG_DIA_INFERRED / 2, 24).color(POST_WHITE).translate(lx, 0, -PIN_BELOW),
  );
}

const asm = assembly('keyswitch-mx');
asm.part('lower-housing', lower);
asm.part('upper-housing', upper);
asm.part('stem-cross-x', stemBarX);
asm.part('stem-cross-y', stemBarY);
asm.part('center-post', post);
contacts.forEach((c, i) => asm.part(`contact-pin-${i}`, c));
legs.forEach((l, i) => asm.part(`fixation-leg-${i}`, l));

return asm.model();
