// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/oled-ssd1327-15.kcad.ts
//
// 1.5" SSD1327 128x128 16-grey OLED module (Waveshare "1.5inch OLED Module"
// form factor, 8-pin SPI/I2C header).
//
// DIMENSION SOURCES
//   PCB outline 44.5 x 37.0 mm — CONFIRMED, Waveshare 1.5inch OLED Module User
//     Manual p.1, corroborated by the Waveshare product page and two resellers:
//     https://files.waveshare.com/upload/8/80/1.5inch_OLED_Module_User_Manual_EN.pdf
//   8-pin single-row header on the right edge (3.3V, GND, NC, DIN, CLK, CS,
//     DC, RST) — CONFIRMED, same manual p.1 pin table + p.2 board photo.
//   Bare panel outline 33.80 x 36.50 x 2.05 mm — CONFIRMED, Crystalfontz
//     CFAL128128A0-015W (the underlying 1.5" 128x128 panel):
//     https://www.crystalfontz.com/product/cfal128128a0015w-128x128-square-oled-display
//   Active area  26.86 x 26.86 mm (square) — CONFIRMED, Crystalfontz,
//     corroborated by DisplayModule. Consistent with 0.21 mm dot pitch x 128.
//   Viewing area 28.86 x 28.86 mm — CONFIRMED, Crystalfontz.
//   Dot pitch 0.21 mm, dot 0.19 x 0.19 mm — CONFIRMED, Crystalfontz.
//
//   NOTE: one search snippet circulates "26.855 x 25.864" (non-square) for the
//   active area. That contradicts both the panel datasheet and the pixel
//   geometry (0.21 x 128 ~= 26.9 on BOTH axes). 26.86 square is used here.
//
// EXPLICITLY UNVERIFIED (do not treat as spec):
//   - PCB thickness and overall module thickness. Waveshare does not publish
//     them; its wiki outline drawing is on a host that refuses automated
//     fetches (403). PCB taken as 1.6 mm — a conventional assumption, NOT a
//     citation. Marked PCB_T_ASSUMED below.
//   - MOUNTING HOLES ARE DELIBERATELY NOT MODELLED. Four corner holes are
//     clearly VISIBLE in the manual's board photo, so they certainly exist,
//     but neither their diameter nor their positions are published anywhere
//     reachable. Enclosures get designed against mounting holes, so guessing
//     them would be worse than leaving them out. Confirm from the Waveshare
//     wiki outline drawing in a real browser before adding them.
//   - Header pitch 2.54 mm is an INFERENCE (Waveshare standard), not a citation.
//   - The left-edge FPC/JST connector's pitch is unpublished; it is modelled
//     as a plain block of the right footprint, not a detailed connector.
//   - Exact panel placement on the carrier PCB is not published; the layout
//     below (panel to the left, header strip on the right) matches the photo
//     but is not from a drawing.

const PCB_L = 44.5; // X, CONFIRMED
const PCB_W = 37.0; // Y, CONFIRMED
const PCB_T_ASSUMED = 1.6; // see header note — assumption, not a spec

const PANEL_L = 33.8; // CONFIRMED (bare panel outline)
const PANEL_W = 36.5; // CONFIRMED
const PANEL_T = 2.05; // CONFIRMED

const VA = 28.86; // viewing area, square, CONFIRMED
const AA = 26.86; // active area, square, CONFIRMED

const PCB_BLACK = '#141418';
const PANEL_DARK = '#0a0c10';
const BEZEL_METAL = '#8f959d';
const PIXEL_GREY = '#c9cdd4';
const HEADER_BLACK = '#1b1b22';
const HEADER_GOLD = '#c8a040';
const CONN_IVORY = '#c8c2b0';
const PASSIVE_TAN = '#8a7050';

// --- PCB -------------------------------------------------------------------
const pcb = box(PCB_L, PCB_W, PCB_T_ASSUMED).color(PCB_BLACK);

// --- OLED panel: left-hand side, centred in Y ------------------------------
// Panel starts at x=3.0 to leave clear space for the left-edge FPC connector
// (which occupies 0.3..2.5); at x=1.0 the two solids overlapped.
const panelX = 3.0;
const panelY = (PCB_W - PANEL_W) / 2; // 0.25
const panel = box(PANEL_L, PANEL_W, PANEL_T)
  .color(PANEL_DARK)
  .translate(panelX, panelY, PCB_T_ASSUMED);

// --- Viewing-area bezel, built as an open rim ON the panel ------------------
// Four bars around the display window rather than a solid plate, so the active
// area shows THROUGH it. A solid plate sunk into the panel would interpenetrate
// the panel solid and z-fight along the coincident faces.
const panelTop = PCB_T_ASSUMED + PANEL_T;
const vaX = panelX + (PANEL_L - VA) / 2;
const vaY = panelY + (PANEL_W - VA) / 2;
const aaX = panelX + (PANEL_L - AA) / 2;
const aaY = panelY + (PANEL_W - AA) / 2;
const RIM_T = 0.4;

const bezelBars: Shape[] = [
  box(aaX - vaX, VA, RIM_T).color(BEZEL_METAL).translate(vaX, vaY, panelTop),
  box(vaX + VA - (aaX + AA), VA, RIM_T).color(BEZEL_METAL).translate(aaX + AA, vaY, panelTop),
  box(AA, aaY - vaY, RIM_T).color(BEZEL_METAL).translate(aaX, vaY, panelTop),
  box(AA, vaY + VA - (aaY + AA), RIM_T).color(BEZEL_METAL).translate(aaX, aaY + AA, panelTop),
];

// --- Active pixel area (square, 128x128), filling the bezel window ----------
const activeArea = box(AA, AA, RIM_T - 0.1).color(PIXEL_GREY).translate(aaX, aaY, panelTop);

// --- 8-pin header along the right edge (2.54mm pitch, INFERRED) -------------
const PIN_COUNT = 8;
const PIN_PITCH = 2.54;
const headerL = (PIN_COUNT - 1) * PIN_PITCH + 2.54; // 20.32mm shroud
const headerX = PCB_L - 2.54 - 2.0;
const headerY = (PCB_W - headerL) / 2;
const headerPins: Shape[] = [];
const headerHoles: Shape[] = [];
for (let i = 0; i < PIN_COUNT; i++) {
  const py = headerY + 1.27 + i * PIN_PITCH - 0.32;
  headerPins.push(
    box(0.64, 0.64, 11.0)
      .color(HEADER_GOLD)
      .translate(headerX + 0.95, py, PCB_T_ASSUMED - 3.0),
  );
  // Clearance hole through the plastic shroud, so the pin passes THROUGH the
  // body rather than interpenetrating it.
  headerHoles.push(
    box(0.9, 0.9, 4.0).translate(headerX + 0.82, py - 0.13, PCB_T_ASSUMED - 0.5),
  );
}

const headerBody = box(2.54, headerL, 2.54)
  .translate(headerX, headerY, PCB_T_ASSUMED)
  .subtract(...headerHoles)
  .color(HEADER_BLACK);

// --- SSD1327 sits on the panel's own FPC; carrier-side support parts --------
// Left-edge FPC/JST-style connector (pitch unpublished — modelled as a block).
const leftConn = box(2.2, 12.0, 1.4)
  .color(CONN_IVORY)
  .translate(0.3, (PCB_W - 12.0) / 2, PCB_T_ASSUMED);

const passives: Shape[] = [];
const passivePositions: [number, number][] = [
  [36.5, 6.0],
  [38.6, 6.0],
  [36.5, 30.0],
  [38.6, 30.0],
];
for (const [cx, cy] of passivePositions) {
  passives.push(box(1.0, 0.5, 0.45).color(PASSIVE_TAN).translate(cx, cy, PCB_T_ASSUMED));
}

const asm = assembly('oled-ssd1327-15');
asm.part('pcb', pcb);
asm.part('panel', panel);
bezelBars.forEach((b, i) => asm.part(`bezel-${i}`, b));
asm.part('active-area', activeArea);
asm.part('header-body', headerBody);
headerPins.forEach((p, i) => asm.part(`header-pin-${i}`, p));
asm.part('fpc-connector', leftConn);
passives.forEach((c, i) => asm.part(`passive-${i}`, c));

return asm.model();
