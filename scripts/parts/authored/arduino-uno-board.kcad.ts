// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/arduino-uno-board.kcad.ts
//
// Arduino Uno R3 (A000066) — kernelCAD model composed from REAL component STEP
// geometry (KiCad packages3D) on an original modeled PCB. Follows the ESP32
// DevKitC template (esp32-devkit-board.kcad.ts): the PCB is our own primitive
// slab; every populated component is a real vendor STEP loaded with
// `lib.fromSTEP(...)`, measured, then rotated/translated onto the board. The
// USB Type-B is the one exception — KiCad packages3D has no Type-B receptacle,
// so it is a plain silver placeholder box (documented in ATTRIBUTION.md).
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..68.6), Y = width (0..53.4), Z = thickness (0..1.6 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T. Length axes (component local Y) are turned onto the
// board X axis with a -90° rotation about Z: (x,y,z) -> (y,-x,z).
//
// Layout (X = length 0..68.6, Y = width 0..53.4), USB end on the left (X=0):
//   - USB Type-B (placeholder) top-left, mouth overhanging the X=0 short edge.
//   - Barrel jack bottom-left, opening overhanging the X=0 short edge.
//   - ATmega328 DIP-28 across the board centre, length along X.
//   - Top long edge (Y high): female 1x08 (digital 0-7) + 1x10 (digital 8-13,
//     AREF/GND/SDA/SCL) with the iconic ~2mm shield gap between them.
//   - Bottom long edge (Y low): female 1x08 (power) + 1x06 (analog A0-A5).
//   - Reset tactile button near the USB; 16MHz HC49 crystal near the ATmega.
//   - Indicator LEDs (ON green, L/TX/RX yellow) near the digital headers.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 68.6; // X  (length)
const PCB_W = 53.4; // Y  (width)
const PCB_T = 1.6;  // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render and LabWired both key off these,
// so every composed component is tinted (imported STEP would otherwise be gray).
// NOTE: .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB is NOT honored.
const PCB_TEAL    = '#0f8a8a'; // Arduino teal/cyan solder mask
const DIP_BLACK   = '#1a1a1a'; // ATmega328 DIP-28 body
const SOCKET_BLK  = '#18181a'; // female header plastic
const USB_SILVER  = '#c8ccd0'; // USB Type-B placeholder shell
const BARREL_BLK  = '#1c1c1e'; // barrel jack housing
const XTAL_METAL  = '#b0b4b8'; // HC49 crystal can
const BTN_RED     = '#d02424'; // reset button cap
const LED_GREEN   = '#22c55e'; // ON power LED
const LED_YELLOW  = '#eab308'; // L / TX / RX LEDs

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,68.6] x [0,53.4] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_TEAL)]);

// ---- ATmega328 — DIP-28 (real STEP) --------------------------------------
// Local: X -0.1..7.7 (row width 7.8), Y -34.3..1.3 (length 35.6), Z -3.3..3.7
// (body up, pins to -3.3, Z0 mount plane). rotate -90 about Z sends the length
// (local Y) onto world X; world Y = -local X (7.8 body width across the board).
// Translate so it runs down the middle: X spans ~16..52, Y centred ~16..24.
{
  const atmega = (await lib.fromSTEP('components/dip28.step'))
    .rotate([0, 0, 1], -90)
    .color(DIP_BLACK)
    .translate(50.5, 23.8, PCB_T);
  parts.push(['atmega328', atmega]);
}

// ---- Female header blocks: 4x vertical PinSocket 2.54mm (real STEP) -------
// Local: X -1.3..1.3 (body width 2.6), Y 0..-(2.54*(n-1)) (pin run), Z -3.1..8.5
// (black plastic receptacle 0..8.5 UP, solder tails -3.1..0 DOWN). Unlike the
// male DevKitC headers, the tall plastic is already +Z, so NO 180° flip: just
// rotate -90 about Z (pin run local Y -> world X) and seat at Z=PCB_T. Plastic
// bottom then lands flush at Z=1.6 and stands proud to Z=10.1; tails poke to
// Z=-1.5 through the board.  world X = X_t + localY, so X_t is the RIGHT end.
{
  const seatZ = PCB_T; // 1.6 — plastic bottom flush on the PCB top
  const yTop = 51.0;   // top long edge, body 2.6 wide -> Y 49.7..52.3 (< 53.4)
  const yBot = 2.4;    // bottom long edge, Y 1.1..3.7
  const blocks: [string, string, number, number][] = [
    // [name, step, rightEndX, Y]
    ['hdr-digital-0-7',  'pinsocket_1x08.step', 40.6, yTop], // D0..D7
    ['hdr-digital-8-scl','pinsocket_1x10.step', 67.3, yTop], // D8..SCL (gap left)
    ['hdr-power',        'pinsocket_1x08.step', 37.0, yBot], // power rail
    ['hdr-analog',       'pinsocket_1x06.step', 55.5, yBot], // A0..A5
  ];
  for (const [name, step, xr, y] of blocks) {
    const sock = (await lib.fromSTEP(`components/${step}`))
      .rotate([0, 0, 1], -90)
      .color(SOCKET_BLK)
      .translate(xr, y, seatZ);
    parts.push([name, sock]);
  }
}

// ---- USB Type-B (placeholder silver box; NOT a fetched STEP) --------------
// KiCad packages3D has no Type-B receptacle. Model the ~16(deep) x 12(wide) x
// 11(tall) mm metal shell as a plain box at the top-left, mouth overhanging the
// X=0 short edge (box spans X -4..12, so 4mm hangs off the edge).
{
  const usb = box(16, 12, 11)
    .color(USB_SILVER)
    .translate(-4, 38, PCB_T);
  parts.push(['usb-type-b', usb]);
}

// ---- Barrel jack (real STEP) ---------------------------------------------
// Local: X -5..5 (width 10), Y -12..1 (depth; barrel opening/hole faces -Y),
// Z -3..9 (body up, pins to -3). rotate -90 about Z sends the -Y mouth to world
// -X (off the X=0 edge) and the 10mm width onto world Y. Translate X_t=6 so the
// mouth (local Y -12 -> world X -6) overhangs and the body sits on the board.
{
  const barrel = (await lib.fromSTEP('components/barrel_jack.step'))
    .rotate([0, 0, 1], -90)
    .color(BARREL_BLK)
    .translate(6, 12, PCB_T);
  parts.push(['barrel-jack', barrel]);
}

// ---- Reset tactile button (real STEP, red cap) ---------------------------
// Local: X -0.4..6.7, Y -5.3..0.8, Z -3.5..4.3 (legs down, cap up, Z0 plane).
// Place near the USB end on the top edge.
{
  const reset = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_RED)
    .translate(14, 45, PCB_T);
  parts.push(['reset-button', reset]);
}

// ---- 16MHz crystal — HC49-U vertical (real STEP, silver can) --------------
// Local: X -3..7.9, Y -2.3..2.3, Z -2.9..13.1 (standing can, leads to -2.9).
// Already vertical — no rotation. Seat near the ATmega/USB.
{
  const xtal = (await lib.fromSTEP('components/crystal_hc49.step'))
    .color(XTAL_METAL)
    .translate(16, 30, PCB_T);
  parts.push(['crystal-16mhz', xtal]);
}

// ---- Indicator LEDs (0805 real STEP; ON green, L/TX/RX yellow) ------------
// Local: X -1..1, Y -0.6..0.6, Z 0..1.1 (tiny, centred). Near digital headers.
{
  const leds: [string, string, number, number][] = [
    ['led-on', LED_GREEN,  18,  8], // power/regulator area, bottom-left
    ['led-l',  LED_YELLOW, 60, 47], // near D13, top edge
    ['led-tx', LED_YELLOW, 46, 47], // near D0/D1, top edge
    ['led-rx', LED_YELLOW, 50, 47],
  ];
  for (const [name, col, x, y] of leds) {
    const led = (await lib.fromSTEP('components/led_0805.step'))
      .color(col)
      .translate(x, y, PCB_T);
    parts.push([name, led]);
  }
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('arduino-uno-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
