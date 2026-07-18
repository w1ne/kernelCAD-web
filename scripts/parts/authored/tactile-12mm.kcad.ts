// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/tactile-12mm.kcad.ts
//
// 12x12 mm THT tactile switch, projected-plunger type, with a round actuator cap.
// Reference part: Omron B3F-4050 (12x12, projected plunger, 7.3 mm) fitted with
// an Omron B32-16x0 9.5 mm round key top. The B3F-4050 IS the archetype that
// the ubiquitous "12x12x7.3" maker clones copy.
//
// DIMENSION SOURCES — Omron B3F datasheet A070-E1 p.6 (footprint + outline):
//   https://omronfs.omron.com/en_US/ecb/products/pdf/en-b3f.pdf
// and Omron B32 key-top datasheet A077-E1 p.237 for the cap:
//   https://datasheet.octopart.com/B32-1610-Omron-datasheet-10910218.pdf
//
//   Body footprint          12.0 +/-0.2 x 12.0 +/-0.2 mm   CONFIRMED (B3F p.6)
//                           also corroborated by CamdenBoss CST12S series.
//   Case (seating) height   3.5 mm                          CONFIRMED (B3F p.6)
//   Total height, flat type 4.3 +/-0.2 mm                   CONFIRMED (B3F p.6)
//   Total height, projected 7.3 +/-0.4 mm  (B3F-4050)       CONFIRMED (B3F p.6)
//   Plunger                 SQUARE 3.8 +/-0.1 mm            CONFIRMED (B3F p.6)
//                           -- NOT a round pin. This square is the mating
//                              interface to the cap's square socket.
//   Plunger protrusion      3.0 mm (= 7.3 - 4.3)            derived from two
//                                                           CONFIRMED heights
//   Circular boss, top face 7.1 mm dia (Omron)              CONFIRMED (B3F p.6)
//                           (CamdenBoss's equivalent is 6.6 dia — differs by
//                            manufacturer; the Omron value is used here.)
//   PCB terminal pitch      12.5 +/-0.1 (X) x 5.0 +/-0.1 (Y) mm, 4 holes of
//                           1.2 +/-0.05 mm dia              CONFIRMED (B3F p.6,
//                           "PCB Processing Dimensions")
//   Lead-tip span           12.5 +/-0.5 / 13.8 +/-0.5 mm    CONFIRMED (B3F p.6)
//   Positioning bosses      2 x 1.6 mm dia                  CONFIRMED (B3F p.6)
//   Operating force         1.27 N {130 gf}, pretravel 0.3 mm  CONFIRMED (p.3)
//
//   Cap (B32-16x0):  9.5 +/-0.2 mm ROUND, 7.0 mm tall, square 3.8 +/-0.1
//                    socket, TOTAL HEIGHT FROM PCB 11.5 +/-0.4 mm,
//                    panel cutout 9.7 +0.05/-0 dia.       ALL CONFIRMED (B32)
//
// NOTE ON PITCH: this part's terminal pitch is 12.5 x 5.0 mm. It is a common
// error to carry over 10.16 x 4.5 — that is the 6x6 B3F footprint (6.5 x 4.5),
// not the 12x12. CamdenBoss independently confirms 5.0 mm on 12x12.
//
// EXPLICITLY UNVERIFIED:
//   - Positioning-boss SPACING is read as 9.0 +/-0.1 mm off the Omron drawing
//     but is not stated in the text — INFERRED. The boss DIAMETER (1.6) and the
//     mating PCB hole (1.8 +/-0.05) are both stated and CONFIRMED.
//   - Cap colour is cosmetic (B32 trailing digit selects it); red is shown.

const BODY = 12.0; // CONFIRMED
const CASE_H = 3.5; // CONFIRMED, seating plane -> case top
const BODY_TOP = 4.3; // CONFIRMED, total height of the flat body incl. boss
const PLUNGER = 3.8; // CONFIRMED, SQUARE
const PLUNGER_TOP = 7.3; // CONFIRMED, projected type total height
const BOSS_DIA = 7.1; // CONFIRMED, circular boss on the top face

// Cap fitted here is the B32-16x0 ROUND key top. The 12 mm square B32-13x0 is
// equally valid but, being exactly as wide as the 12 mm body, it completely
// hides the switch and makes the catalog model unreadable as a tactile switch.
const CAP_DIA = 9.5; // CONFIRMED, B32-16x0 outline (9.5 +/-0.2 dia)
const CAP_H = 7.0; // CONFIRMED, B32-16x0 cap height
const CAP_TOP = 11.5; // CONFIRMED, B32-16x0 total height from PCB
const CAP_BOTTOM = CAP_TOP - CAP_H; // 4.5
const CAP_SOCKET = 3.9; // CONFIRMED socket is square 3.8 +/-0.1; 3.9 models it
// with a nominal fit clearance over the 3.8 plunger.

const PITCH_X = 12.5; // CONFIRMED
const PITCH_Y = 5.0; // CONFIRMED
const LEAD_DIA = 1.0; // lead body; mates the CONFIRMED 1.2mm PCB hole
const BOSS_SPACING = 9.0; // INFERRED from the drawing — see note above
const LOC_BOSS_DIA = 1.6; // CONFIRMED

const BODY_BLACK = '#26262b';
const BOSS_GREY = '#3d3d44';
const PLUNGER_GREY = '#55555e';
const CAP_RED = '#b8342c';
const LEAD_METAL = '#b8b8b0';

// Everything is built about the switch centre at (0,0); z=0 is the PCB surface.
const half = BODY / 2;

// --- Main case (12 x 12 x 3.5) ---------------------------------------------
const caseBody = box(BODY, BODY, CASE_H).color(BODY_BLACK).translate(-half, -half, 0);

// --- Circular boss on the top face, 7.1 dia, 3.5 -> 4.3 --------------------
const boss = cylinder(BODY_TOP - CASE_H, BOSS_DIA / 2, 48).color(BOSS_GREY).translate(0, 0, CASE_H);

// --- Square plunger, 3.8 sq, 4.3 -> 7.3 -------------------------------------
const plunger = box(PLUNGER, PLUNGER, PLUNGER_TOP - BODY_TOP)
  .color(PLUNGER_GREY)
  .translate(-PLUNGER / 2, -PLUNGER / 2, BODY_TOP);

// --- B32-16x0 round key top: 9.5 dia, 7.0 tall, sits at 4.5 -> 11.5 --------
// The square socket is cut out so the cap SEATS on the plunger rather than
// interpenetrating it — the socket is the real mating interface.
const socketDepth = 3.0; // 4.5 -> 7.5, clearing the 7.3 plunger top
const capSocket = box(CAP_SOCKET, CAP_SOCKET, socketDepth).translate(
  -CAP_SOCKET / 2,
  -CAP_SOCKET / 2,
  CAP_BOTTOM,
);
const cap = cylinder(CAP_H, CAP_DIA / 2, 48)
  .translate(0, 0, CAP_BOTTOM)
  .subtract(capSocket)
  .color(CAP_RED);

// --- Four leads at 12.5 (X) x 5.0 (Y) pitch, running below the PCB ---------
const leads: Shape[] = [];
const leadPositions: [number, number][] = [
  [-PITCH_X / 2, -PITCH_Y / 2],
  [PITCH_X / 2, -PITCH_Y / 2],
  [-PITCH_X / 2, PITCH_Y / 2],
  [PITCH_X / 2, PITCH_Y / 2],
];
for (const [lx, ly] of leadPositions) {
  // vertical through-hole pin
  leads.push(cylinder(3.5, LEAD_DIA / 2, 16).color(LEAD_METAL).translate(lx, ly, -3.2));
  // the flat strap that runs out of the case to the pin
  leads.push(
    box(Math.abs(lx) - half + 0.9, 1.4, 0.3)
      .color(LEAD_METAL)
      .translate(lx > 0 ? half - 0.6 : -Math.abs(lx) - 0.3, ly - 0.7, 0.15),
  );
}

// --- Two locating bosses on the underside (1.6 dia) -------------------------
const locBosses: Shape[] = [];
for (const bx of [-BOSS_SPACING / 2, BOSS_SPACING / 2]) {
  locBosses.push(cylinder(1.4, LOC_BOSS_DIA / 2, 24).color(BODY_BLACK).translate(bx, 0, -1.4));
}

const asm = assembly('tactile-12mm');
asm.part('case', caseBody);
asm.part('boss', boss);
asm.part('plunger', plunger);
asm.part('keycap', cap);
leads.forEach((l, i) => asm.part(`lead-${i}`, l));
locBosses.forEach((b, i) => asm.part(`locating-boss-${i}`, b));

return asm.model();
