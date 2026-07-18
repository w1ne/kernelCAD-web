// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/rotary-encoder-ec11.kcad.ts
//
// EC11-class 12 mm incremental rotary encoder with integral pushbutton switch,
// knurled D-shaft, vertical PCB mount (shaft up, can flat on the board).
// Modelled on Bourns PEC11R-4xxx with a 20 mm actuator (LB = 7 mm bushing),
// cross-checked against ALPS EC11E. The two datasheets agree on every shared
// number, so the "EC11 standard" this models is real and not a single vendor's.
//
// DIMENSION SOURCES
//   Bourns PEC11R : https://www.bourns.com/docs/Product-Datasheets/PEC11R.pdf
//   ALPS  EC11E   : https://file.elecfans.com/web1/M00/90/2D/o4YBAFzFBtCALQJ0AAlE9NU9dVE732.pdf
//
//   Can (body) front view    12.5 x 13.4 mm (Bourns)        CONFIRMED
//                            11.7 x 12.0 mm (ALPS EC11E)    CONFIRMED
//                            Bourns figures used here.
//   Overall width incl. tabs 14.0 mm (.551)                 CONFIRMED (Bourns)
//   Bushing thread           M7 x 0.75                      CONFIRMED (both)
//   Bushing length LB        7.0 mm (for 20/25/30 mm shaft) CONFIRMED (Bourns)
//   Shaft diameter           6.0 +/-0.1 mm                  CONFIRMED (both)
//   Shaft length L           20 mm (option; 15/25/30 also)  CONFIRMED (Bourns)
//   D-flat across-flat       4.5 +0/-0.05 mm                CONFIRMED (both)
//   Flat length F            10 mm for L = 20               CONFIRMED (Bourns)
//   Shaft-end chamfer        C 0.5 mm                       CONFIRMED (Bourns)
//   Knurl                    18 teeth on the 6.0 dia shaft  CONFIRMED (Bourns p.3)
//   Encoder pins A-C-B pitch 2.5 mm (5.0 mm A->B span)      CONFIRMED (both)
//   Switch pins D-E pitch    5.0 mm                         CONFIRMED (ALPS)
//   Row spacing enc <-> sw   7.0 mm                         CONFIRMED (ALPS)
//   Pin hole diameter        1.0 +0.1/-0 mm, 5 places       CONFIRMED (both)
//   Mounting pegs            RECTANGULAR 2.6 x 1.8 mm, 2x   CONFIRMED (Bourns
//                            -4xxx). They are NOT round pegs.
//   Mounting peg spacing     13.2 mm (Bourns -4xxx)         CONFIRMED
//   Switch travel            0.5 +/-0.3 mm, ~610 gf         CONFIRMED (Bourns)
//
// EXPLICITLY UNVERIFIED (stated assumptions, not spec):
//   - CAN DEPTH (the body thickness along the shaft axis) is taken as 7.5 mm.
//     Bourns NEVER dimensions body depth; the 7.0/10 mm numbers in its side
//     views are the pin side-facing offset (terminal codes 1 vs 2), not can
//     thickness. 7.5 comes from ALPS's "7.5 max." front-view note, and closes
//     ALPS's own arithmetic exactly (7.5 + 7 + 10 = 24.5 overall). Treated as
//     INFERRED. Everything above the PCB therefore keys off CAN_DEPTH_INFERRED.
//   - Shaft length above the bushing = L - LB = 20 - 7 = 13 mm is arithmetic
//     from two confirmed numbers, not a dimensioned callout.
//   - Bourns tabulates knurl-zone dimensions P and A (e.g. L=20 with switch:
//     P=7, A=6) but the drawing is ambiguous about WHICH is knurl length and
//     which is offset. The knurl is therefore modelled over the lower part of
//     the exposed shaft at a plausible 7 mm; treat the knurl EXTENT as
//     unverified. Tooth COUNT (18) and shaft diameter are confirmed.
//   - The supplied nut (10.0 A/F x 2.0) and washer (12.0 OD) are NOT modelled;
//     they ship loose, they are not part of the soldered footprint.

const CAN_W = 12.5; // X, CONFIRMED (Bourns front view)
const CAN_H = 13.4; // Y, CONFIRMED (Bourns front view)
const CAN_DEPTH_INFERRED = 7.5; // Z above PCB — see note, INFERRED from ALPS
const TAB_SPAN = 14.0; // overall width incl. side tabs, CONFIRMED

const BUSHING_OD = 7.0; // M7 major dia, CONFIRMED thread spec
const BUSHING_LEN = 7.0; // LB, CONFIRMED
const SHAFT_DIA = 6.0; // CONFIRMED
const SHAFT_ABOVE_BUSHING = 13.0; // L(20) - LB(7), arithmetic
const FLAT_ACROSS = 4.5; // CONFIRMED
const FLAT_LEN = 10.0; // F for L=20, CONFIRMED
const KNURL_TEETH = 18; // CONFIRMED
const KNURL_LEN = 7.0; // extent UNVERIFIED — see note

const PIN_ENC_PITCH = 2.5; // CONFIRMED
const PIN_SW_PITCH = 5.0; // CONFIRMED
const ROW_SPACING = 7.0; // CONFIRMED
const PIN_DIA = 1.0; // CONFIRMED
const PEG_X = 2.6; // CONFIRMED (rectangular)
const PEG_Y = 1.8; // CONFIRMED
const PEG_SPACING = 13.2; // CONFIRMED

const CAN_METAL = '#9fa4ab';
const TAB_METAL = '#8b9098';
const BUSHING_METAL = '#7d828a';
const SHAFT_METAL = '#c2c6cc';
const KNURL_METAL = '#a8acb2';
const PIN_METAL = '#c9a55a';

// Built about the shaft axis at (0,0); z = 0 is the PCB surface.
const canTop = CAN_DEPTH_INFERRED;
const bushingTop = canTop + BUSHING_LEN;
const shaftTop = bushingTop + SHAFT_ABOVE_BUSHING; // 27.5 overall

// --- Metal can -------------------------------------------------------------
const can = box(CAN_W, CAN_H, CAN_DEPTH_INFERRED)
  .color(CAN_METAL)
  .translate(-CAN_W / 2, -CAN_H / 2, 0);

// --- Side mounting tabs bringing overall width to 14.0 ---------------------
const tabW = (TAB_SPAN - CAN_W) / 2; // 0.75 each side
const tabs: Shape[] = [];
for (const sx of [-1, 1]) {
  tabs.push(
    box(tabW, 4.5, 1.2)
      .color(TAB_METAL)
      .translate(sx > 0 ? CAN_W / 2 : -CAN_W / 2 - tabW, -2.25, 1.0),
  );
}

// --- Threaded bushing (M7 x 0.75), plus a ring of thread crests ------------
const bushing = cylinder(BUSHING_LEN, BUSHING_OD / 2, 48)
  .color(BUSHING_METAL)
  .translate(0, 0, canTop);

// Thread crests: a stack of thin rings slightly proud of the bushing OD, at
// the confirmed 0.75 mm pitch. Cosmetic, but makes the thread legible.
const threads: Shape[] = [];
const threadCount = Math.floor(BUSHING_LEN / 0.75) - 1;
for (let i = 0; i < threadCount; i++) {
  threads.push(
    cylinder(0.36, BUSHING_OD / 2 + 0.12, 48)
      .color(BUSHING_METAL)
      .translate(0, 0, canTop + 0.4 + i * 0.75),
  );
}

// --- Shaft: 6.0 dia, knurled over the lower zone, D-flat over the top 10mm --
const shaftLen = shaftTop - bushingTop;
let shaft = cylinder(shaftLen, SHAFT_DIA / 2, 48).color(SHAFT_METAL).translate(0, 0, bushingTop);

// 18 axial knurl teeth around the circumference, on the lower knurl zone.
const knurlRibs: Shape[] = [];
for (let i = 0; i < KNURL_TEETH; i++) {
  const ang = (i / KNURL_TEETH) * Math.PI * 2;
  const r = SHAFT_DIA / 2 - 0.12;
  knurlRibs.push(
    box(0.55, 0.55, KNURL_LEN)
      .color(KNURL_METAL)
      .translate(-0.275, -0.275, 0)
      .rotate([0, 0, 1], (ang * 180) / Math.PI)
      .translate(r * Math.cos(ang), r * Math.sin(ang), bushingTop),
  );
}

// D-flat: across-flat 4.5 means the flat plane sits 4.5 - 3.0 = 1.5 mm from the
// axis. Cut it over the top FLAT_LEN of the shaft.
const flatOffset = FLAT_ACROSS - SHAFT_DIA / 2; // 1.5
const flatCutter = box(SHAFT_DIA, SHAFT_DIA, FLAT_LEN + 1.0).translate(
  flatOffset,
  -SHAFT_DIA / 2,
  shaftTop - FLAT_LEN,
);
shaft = shaft.subtract(flatCutter).color(SHAFT_METAL);

// --- Terminals -------------------------------------------------------------
// Encoder row: A, C, B on 2.5mm pitch. Switch row: D, E on 5.0mm pitch,
// 7.0mm away in Y. Pins exit the can and run down through the PCB.
const pins: Shape[] = [];
const encY = -ROW_SPACING / 2;
const swY = ROW_SPACING / 2;
for (const px of [-PIN_ENC_PITCH, 0, PIN_ENC_PITCH]) {
  pins.push(cylinder(4.5, PIN_DIA / 2, 16).color(PIN_METAL).translate(px, encY, -3.2));
}
for (const px of [-PIN_SW_PITCH / 2, PIN_SW_PITCH / 2]) {
  pins.push(cylinder(4.5, PIN_DIA / 2, 16).color(PIN_METAL).translate(px, swY, -3.2));
}

// --- Two RECTANGULAR mounting pegs at 13.2mm spacing -----------------------
const pegs: Shape[] = [];
for (const gx of [-PEG_SPACING / 2, PEG_SPACING / 2]) {
  pegs.push(
    box(PEG_X, PEG_Y, 3.0)
      .color(CAN_METAL)
      .translate(gx - PEG_X / 2, -PEG_Y / 2, -3.0),
  );
}

const asm = assembly('rotary-encoder-ec11');
asm.part('can', can);
tabs.forEach((t, i) => asm.part(`mount-tab-${i}`, t));
asm.part('bushing', bushing);
threads.forEach((t, i) => asm.part(`thread-${i}`, t));
asm.part('shaft', shaft);
knurlRibs.forEach((k, i) => asm.part(`knurl-${i}`, k));
pins.forEach((p, i) => asm.part(`pin-${i}`, p));
pegs.forEach((p, i) => asm.part(`peg-${i}`, p));

return asm.model();
