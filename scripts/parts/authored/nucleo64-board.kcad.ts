// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/nucleo64-board.kcad.ts
//
// ST NUCLEO-64 (MB1136) development board — one model serving both
// NUCLEO-F401RE and NUCLEO-L476RG (they share the MB1136 PCB). Composed from
// REAL component STEP geometry (KiCad packages3D) on an original modeled PCB,
// following the esp32-devkit-board.kcad.ts template idioms exactly.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..82.5), Y = width (0..70), Z = thickness (0..1.6 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T (or, for through-hole parts, so the plastic body's
// bottom is flush with the PCB top face at Z=1.6).
//
// Layout (X = length 0..82.5, Y = width 0..70):
//   - ST-Link/V2-1 programmer occupies the top ~26mm of the length (X 0..26).
//     Mini-USB mouth overhangs the X=0 short edge; ST-Link STM32F103 (LQFP-48)
//     and the ST-Link status LED live here.
//   - A thin dark silkscreen strip across the width at X≈25.6 marks the
//     snap-off break line (thin flat box; the board is NOT actually split).
//   - Target MCU (LQFP-64) centered in the lower/target area.
//   - Two 2x19 Morpho male headers down both long outer edges (plastic proud on
//     top, long pins down through the board).
//   - Arduino Uno R3 female pin sockets inboard of the Morpho headers:
//     1x10 + 1x08 on the Y≈12 edge, 1x08 + 1x06 on the Y≈58 edge.
//   - RESET (black) + USER (blue) tactile buttons; power/user/ST-Link LEDs.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 82.5; // X  (length)
const PCB_W = 70.0; // Y  (width)
const PCB_T = 1.6;  // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render keys off these; imported STEP
// would otherwise fall back to gray.
// NOTE: .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB is NOT honored.
const PCB_GREEN   = '#1f7a4d'; // ST Nucleo solder-mask green
const LQFP_BLACK  = '#1a1a1a'; // LQFP package epoxy body
const HDR_BLACK   = '#18181a'; // Morpho header plastic
const SOCKET_BLACK= '#141416'; // Arduino female pin-socket plastic
const USB_SILVER  = '#c8ccd0'; // mini-USB shell
const BTN_BLACK   = '#1c1c1e'; // RESET tactile switch body
const BTN_BLUE    = '#2a52d8'; // USER (blue) tactile switch body
const IC_BREAK    = '#0c0c0e'; // snap-off break-line silkscreen strip
const LED_RED     = '#d02424'; // power LED
const LED_GREEN   = '#28a838'; // LD2 user + ST-Link status LEDs

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,82.5] x [0,70] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_GREEN)]);

// Snap-off break line: a thin dark silkscreen strip across the full width at
// X≈25.6, sitting on the +Z face (does NOT split the board).
{
  const strip = box(0.8, PCB_W, 0.15)
    .color(IC_BREAK)
    .translate(25.2, 0, PCB_T);
  parts.push(['stlink-break-line', strip]);
}

// ---- Target MCU: LQFP-64 (real STEP) -------------------------------------
// Local: X -6..6, Y -6..6, Z 0..1.5 (10x10 body + leads = 12x12; base on Z0).
// Centered in the lower/target area; body flat, seated on the +Z face.
{
  const mcu = (await lib.fromSTEP('components/lqfp64.step'))
    .color(LQFP_BLACK)
    .translate(54.0, PCB_W / 2, PCB_T);
  parts.push(['target-mcu-lqfp64', mcu]);
}

// ---- ST-Link MCU: STM32F103 LQFP-48 (real STEP) --------------------------
// Local: X -4.5..4.5, Y -4.5..4.5, Z 0..1.5 (7x7 body + leads = 9x9; base Z0).
{
  const stlink = (await lib.fromSTEP('components/lqfp48.step'))
    .color(LQFP_BLACK)
    .translate(16.0, 40.0, PCB_T);
  parts.push(['stlink-mcu-lqfp48', stlink]);
}

// ---- Mini-USB connector (ST-Link, real STEP; horizontal) -----------------
// Local: X -4.9..4.9 (shell width), Y -5.8..3.4 (mouth faces local -Y), Z -1..4.
// rotate([0,0,1],-90): (x,y,z) -> (y,-x,z):
//   world X = local Y  -> mouth (local Y -5.8) lands at world X -5.8 (off edge)
//   world Y = -local X -> 9.8mm shell across the board, centered on rowY
//   world Z = local Z  -> body stays flat on the +Z face
// Translate +2 in X so the mounting body sits on the PCB while the mouth
// overhangs the X=0 short edge; seat flat at Z=PCB_T.
{
  const usb = (await lib.fromSTEP('components/usb_mini_b.step'))
    .rotate([0, 0, 1], -90)
    .color(USB_SILVER)
    .translate(2.0, PCB_W / 2, PCB_T);
  parts.push(['stlink-mini-usb', usb]);
}

// ---- Morpho headers: two 2x19 2.54mm male (real STEP) --------------------
// Local: X -1.3..3.8 (two pin rows), Y 0..-47 (19 positions), Z -3..8.5
// (plastic insulator local Z 0..2.5, 8.5mm mating pins up, 3mm tails down).
// Pins DOWN (task rule): flip 180 about X, then -90 about Z (same as template).
//   rotate([1,0,0],180): (x,y,z) -> (x,-y,-z)   [long pins now at -Z]
//   rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//   combined:            (x,y,z) -> (-y,-x,-z)
//     world X = -local Y  -> pins run 0..+47 in X
//     world Y = -local X  -> two-row 5.1mm strip
//     world Z = -local Z + tz
// With headerZ = PCB_T + PLASTIC_H = 4.1, the plastic body (local Z 0..2.5)
// lands at world Z [1.6, 4.1] — bottom flush on the PCB top (1.6), proud on top.
// Long mating pins (local Z 2.5..8.5) run from Z=1.6 DOWN to Z=-4.4.
{
  const PLASTIC_H = 2.5;
  const headerZ = PCB_T + PLASTIC_H;          // 4.1 — plastic bottom flush at 1.6
  const rowStartX = 30.0;                       // spans X 30..77 (target section)
  const rowYs = [4.5, PCB_W - 4.5];            // ~4.5mm in from each long edge
  for (let r = 0; r < rowYs.length; r++) {
    const hdr = (await lib.fromSTEP('components/pinheader_2x19.step'))
      .rotate([1, 0, 0], 180)
      .rotate([0, 0, 1], -90)
      .color(HDR_BLACK)
      .translate(rowStartX, rowYs[r], headerZ);
    parts.push([`morpho-row-${r}`, hdr]);
  }
}

// ---- Arduino Uno R3 female pin sockets (real STEP) -----------------------
// Local (1x10 example): X -1.3..1.3, Y 0..-24.1, Z -3.1..8.5 (body 0..8.5 opens
// UP, 3.1mm solder tails down). Female sockets are NOT flipped: body stays
// upright (openings up), seated so the body bottom (local Z0) is flush on the
// PCB top (Z=1.6), tails protrude down through the board.
//   rotate([0,0,1],90): (x,y,z) -> (-y,x,z)
//     world X = -local Y -> runs 0..+len in X
//     world Y = local X  -> 2.6mm strip
//     world Z = local Z + PCB_T -> body 1.6..10.1 (proud, taller than board)
{
  const socketZ = PCB_T; // body bottom (local Z0) flush on PCB top face
  // Inner (Y≈12) edge: digital headers, 1x08 (D0..D7) + 1x10 (D8..D15).
  const sockA = (await lib.fromSTEP('components/pinsocket_1x08.step'))
    .rotate([0, 0, 1], 90).color(SOCKET_BLACK).translate(28.0, 12.0, socketZ);
  parts.push(['arduino-cn9-1x08', sockA]);
  const sockB = (await lib.fromSTEP('components/pinsocket_1x10.step'))
    .rotate([0, 0, 1], 90).color(SOCKET_BLACK).translate(51.0, 12.0, socketZ);
  parts.push(['arduino-cn5-1x10', sockB]);
  // Outer (Y≈58) edge: power 1x08 + analog 1x06 (A0..A5).
  const sockC = (await lib.fromSTEP('components/pinsocket_1x08.step'))
    .rotate([0, 0, 1], 90).color(SOCKET_BLACK).translate(28.0, 58.0, socketZ);
  parts.push(['arduino-cn6-1x08', sockC]);
  const sockD = (await lib.fromSTEP('components/pinsocket_1x06.step'))
    .rotate([0, 0, 1], 90).color(SOCKET_BLACK).translate(52.0, 58.0, socketZ);
  parts.push(['arduino-cn8-1x06', sockD]);
}

// ---- Buttons: RESET (black) + USER (blue) (real STEP) --------------------
// button_tht_6mm local: X -0.4..6.7, Y -5.3..0.8, Z -3.5..4.3 (legs down, cap up).
{
  const reset = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(6.0, 60.0, PCB_T);
  parts.push(['reset-button', reset]);
  const user = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLUE)
    .translate(72.0, 35.0, PCB_T);
  parts.push(['user-button', user]);
}

// ---- Indicator LEDs (0805, real STEP; tinted) ----------------------------
// Local: X -1..1, Y -0.6..0.6, Z 0..1.1 (centered).
{
  const ledPwr = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_RED)
    .translate(34.0, 35.0, PCB_T);
  parts.push(['led-power', ledPwr]);
  const ledUsr = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_GREEN)
    .translate(44.0, 40.0, PCB_T);
  parts.push(['led-ld2-user', ledUsr]);
  const ledStl = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_GREEN)
    .translate(10.0, 52.0, PCB_T);
  parts.push(['led-stlink', ledStl]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('nucleo64-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
