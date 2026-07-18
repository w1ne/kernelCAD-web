// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/oled-sh1106-13.kcad.ts
//
// 1.3" SH1106 128x64 I2C OLED module (4-pin: GND / VCC / SCL / SDA).
//
// DIMENSION SOURCES
//   PCB outline 35.40 x 33.50 mm  — CONFIRMED, lcdwiki MC130VX ("Module PCB Size
//     33.50x35.40") https://www.lcdwiki.com/1.3inch_IIC_OLED_Module_SKU:MC130VX
//     independently corroborated by DisplayModule's 1.3" I2C product spec.
//   Overall module thickness 2.7 mm (PCB + glass, excluding header pins)
//     — CONFIRMED as a vendor spec (DisplayModule), no drawing behind it.
//   Glass panel 34.5 x 23.0 x 1.4 mm (+/-0.2, t +/-0.1) — CONFIRMED from the
//     outline drawing, Allvision 1.3" SH1106 datasheet section 1.4:
//     https://cdn.sparkfun.com/assets/2/6/8/9/7/1.3inch-SH1106-OLED_Datasheet.pdf
//   Metal cap (frame) 34.5 x 19.2 mm (+/-0.2)  — CONFIRMED, same drawing 1.4.
//   Polarizer 33.5 x 18.2 mm (+/-0.2)          — CONFIRMED, same drawing 1.4.
//   Viewing area 31.42 x 16.7 mm (+/-0.2)      — CONFIRMED, same drawing 1.4.
//   Active area 29.42 x 14.7 mm                — CONFIRMED, same datasheet 1.2/1.3
//     (= 0.23 mm pixel pitch x 128 - 0.02). Pixel pitch 0.23, pixel 0.21 mm.
//
// EXPLICITLY UNVERIFIED (modelled to a stated assumption, do not treat as spec):
//   - PCB thickness alone. No source. Taken as 1.30 mm, inferred only as
//     2.7 (overall) - 1.4 (glass) = 1.3. Marked PCB_T_ASSUMED below.
//   - Where the glass sits on the carrier PCB, and which edge carries the
//     header. No drawing of the carrier PCB could be found. The layout below
//     (header along the -Y long edge, glass centred in X and pushed to +Y) is
//     the common physical arrangement of this board but is NOT from a drawing.
//   - Header pitch 2.54 mm is an INFERENCE from this board class, not a citation.
//   - MOUNTING HOLES ARE DELIBERATELY NOT MODELLED. The 4-pin I2C variant's
//     spec tables list none and no drawing was found; the 7-pin SPI variant is
//     a different board. Inventing hole positions here would be worse than
//     omitting them, since enclosures get designed against them.

const PCB_L = 35.4; // X, CONFIRMED
const PCB_W = 33.5; // Y, CONFIRMED
const PCB_T_ASSUMED = 1.3; // see header note — inferred, not a spec

const GLASS_L = 34.5; // CONFIRMED
const GLASS_W = 23.0; // CONFIRMED
const GLASS_T = 1.4; // CONFIRMED

const CAP_L = 34.5; // metal frame, CONFIRMED
const CAP_W = 19.2; // CONFIRMED
const AA_L = 29.42; // active area, CONFIRMED
const AA_W = 14.7; // CONFIRMED

const PCB_BLUE = '#12325a';
const GLASS_DARK = '#0a0f18';
const FRAME_METAL = '#9aa0a8';
const PIXEL_GLOW = '#2f6fd0';
const HEADER_BLACK = '#1b1b22';
const HEADER_GOLD = '#c8a040';
const PASSIVE_TAN = '#8a7050';

// --- PCB -------------------------------------------------------------------
const pcb = box(PCB_L, PCB_W, PCB_T_ASSUMED).color(PCB_BLUE);

// --- Glass panel: centred in X, pushed toward +Y to leave the header strip --
const glassX = (PCB_L - GLASS_L) / 2; // 0.45
const glassY = PCB_W - GLASS_W - 0.5; // ~10.0 -> leaves a 10mm header strip
const glass = box(GLASS_L, GLASS_W, GLASS_T)
  .color(GLASS_DARK)
  .translate(glassX, glassY, PCB_T_ASSUMED);

// --- Metal cap / frame bezel, sitting ON the glass as an open rim ----------
// Built as four bars around the display window rather than a solid plate, so
// the active area shows THROUGH it. A solid plate embedded in the glass would
// both interpenetrate the glass and z-fight along the coincident side faces.
const glassTop = PCB_T_ASSUMED + GLASS_T;
const capX = glassX + (GLASS_L - CAP_L) / 2;
const capY = glassY + (GLASS_W - CAP_W) / 2;
const aaX = capX + (CAP_L - AA_L) / 2;
const aaY = capY + (CAP_W - AA_W) / 2;
const RIM_T = 0.35;

const frameBars: Shape[] = [
  // left / right bars, full bezel height
  box(aaX - capX, CAP_W, RIM_T).color(FRAME_METAL).translate(capX, capY, glassTop),
  box(capX + CAP_L - (aaX + AA_L), CAP_W, RIM_T)
    .color(FRAME_METAL)
    .translate(aaX + AA_L, capY, glassTop),
  // bottom / top bars, spanning only the window width
  box(AA_L, aaY - capY, RIM_T).color(FRAME_METAL).translate(aaX, capY, glassTop),
  box(AA_L, capY + CAP_W - (aaY + AA_W), RIM_T)
    .color(FRAME_METAL)
    .translate(aaX, aaY + AA_W, glassTop),
];

// --- Active pixel area, filling the bezel window, slightly below the rim ----
const activeArea = box(AA_L, AA_W, RIM_T - 0.1)
  .color(PIXEL_GLOW)
  .translate(aaX, aaY, glassTop);

// --- 4-pin I2C header along the -Y long edge (2.54mm pitch, INFERRED) -------
const PIN_COUNT = 4;
const PIN_PITCH = 2.54;
const headerW = (PIN_COUNT - 1) * PIN_PITCH + 2.54; // 10.16mm shroud
const headerX = (PCB_L - headerW) / 2;
const headerY = 1.2;
const headerPins: Shape[] = [];
const headerHoles: Shape[] = [];
for (let i = 0; i < PIN_COUNT; i++) {
  const px = headerX + 1.27 + i * PIN_PITCH - 0.32;
  // 0.64mm square post, running from below the PCB up through the shroud
  headerPins.push(
    box(0.64, 0.64, 11.0)
      .color(HEADER_GOLD)
      .translate(px, headerY + 0.95, PCB_T_ASSUMED - 3.0),
  );
  // Clearance hole through the plastic shroud, so the pin passes THROUGH the
  // body rather than interpenetrating it.
  headerHoles.push(
    box(0.9, 0.9, 4.0).translate(px - 0.13, headerY + 0.82, PCB_T_ASSUMED - 0.5),
  );
}

const headerBody = box(headerW, 2.54, 2.54)
  .translate(headerX, headerY, PCB_T_ASSUMED)
  .subtract(...headerHoles)
  .color(HEADER_BLACK);

// --- SH1106 driver sits on the panel's FPC tail, at the glass edge ----------
// The panel's FPC tail is 15 x 8 x 0.05mm, 30 pins @ 0.70mm pitch — CONFIRMED
// (datasheet 1.4). On the assembled module the tail folds back UNDER the panel,
// so only the run between the panel edge and the PCB is exposed. Only that
// exposed run is modelled; drawing the full 8mm length here would drive the
// tail into the glass solid.
const FPC_EXPOSED = 6.8;
const fpc = box(15.0, FPC_EXPOSED, 0.2)
  .color('#3a2a10')
  .translate((PCB_L - 15.0) / 2, glassY - FPC_EXPOSED - 0.2, PCB_T_ASSUMED);
const driverIc = box(9.0, 1.6, 0.6)
  .color('#181820')
  .translate((PCB_L - 9.0) / 2, glassY - 5.2, PCB_T_ASSUMED + 0.2);

// --- A few passives on the header strip -------------------------------------
const passives: Shape[] = [];
const passivePositions: [number, number][] = [
  [5.0, 6.4],
  [7.2, 6.4],
  [26.5, 6.4],
  [28.7, 6.4],
];
for (const [cx, cy] of passivePositions) {
  passives.push(box(1.0, 0.5, 0.45).color(PASSIVE_TAN).translate(cx, cy, PCB_T_ASSUMED));
}

const asm = assembly('oled-sh1106-13');
asm.part('pcb', pcb);
asm.part('glass', glass);
frameBars.forEach((b, i) => asm.part(`bezel-${i}`, b));
asm.part('active-area', activeArea);
asm.part('fpc-tail', fpc);
asm.part('sh1106-driver', driverIc);
asm.part('header-body', headerBody);
headerPins.forEach((p, i) => asm.part(`header-pin-${i}`, p));
passives.forEach((c, i) => asm.part(`passive-${i}`, c));

return asm.model();
