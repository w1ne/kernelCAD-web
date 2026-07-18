// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/h563zi-board.kcad.ts
//
// ST NUCLEO-H563ZI (Nucleo-144, MB1404) development board — kernelCAD model
// composed from REAL component STEP geometry (KiCad packages3D) on an original
// modeled PCB, following the esp32-devkit-board.kcad.ts / nucleo64-board.kcad.ts
// template idioms exactly.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..147), Y = width (0..70), Z = thickness (0..1.6 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T (or, for through-hole headers, so the plastic body's
// bottom is flush with the PCB top face at Z=1.6 and the long pins run down).
//
// Layout (X = length 0..147, Y = width 0..70):
//   - ST-Link/V3 programmer occupies the top ~30mm of the length (X 0..30):
//     ST-Link MCU (LQFP-48), a micro-USB (ST-Link) whose mouth overhangs the
//     X=0 short edge, and the ST-Link status LED.
//   - A thin dark silkscreen strip across the width at X≈30 marks the snap-off
//     break line (the board is NOT actually split).
//   - Target MCU STM32H563ZI (LQFP-144) centered in the main/target area.
//   - Two Zio/Morpho 2x19 male headers per long edge (four total), placed
//     end-to-end to span the length. Plastic proud on top, long pins down.
//   - User USB-C (CN1) on the Y=0 long side edge, mouth overhanging the edge.
//   - RJ45 Ethernet jack at the X=147 bottom short edge, mouth overhanging.
//   - RESET (black) + USER (blue) tactile buttons; LD1/LD2/LD3 (green/yellow/red)
//     indicator LEDs.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 147.0; // X  (length)
const PCB_W = 70.0;  // Y  (width)
const PCB_T = 1.6;   // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render keys off these; imported STEP
// would otherwise fall back to gray.
// NOTE: .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB is NOT honored.
const PCB_GREEN    = '#1f7a4d'; // ST Nucleo solder-mask green
const LQFP_BLACK   = '#1a1a1a'; // LQFP package epoxy body
const HDR_BLACK    = '#18181a'; // Morpho/Zio header plastic
const USB_SILVER   = '#c8ccd0'; // USB / RJ45 metal shell
const BTN_BLACK    = '#1c1c1e'; // RESET tactile switch body
const BTN_BLUE     = '#2a52d8'; // USER (blue) tactile switch body
const IC_BREAK     = '#0c0c0e'; // snap-off break-line silkscreen strip
const LED_GREEN    = '#28a838'; // LD1 green
const LED_YELLOW   = '#e0c020'; // LD2 yellow
const LED_RED      = '#d02424'; // LD3 red

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,147] x [0,70] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_GREEN)]);

// ---- Snap-off break line (ST-Link section) -------------------------------
// Thin dark silkscreen strip across the full width at X≈30, on the +Z face.
{
  const strip = box(0.8, PCB_W, 0.15)
    .color(IC_BREAK)
    .translate(29.6, 0, PCB_T);
  parts.push(['stlink-break-line', strip]);
}

// ---- Target MCU: STM32H563ZI LQFP-144 (real STEP) ------------------------
// Local: X -11..11, Y -11..11, Z 0..1.5 (20x20 body + leads = 22x22; base Z0).
// Centered in the main/target area (X between the break line and the RJ45).
{
  const mcu = (await lib.fromSTEP('components/lqfp144.step'))
    .color(LQFP_BLACK)
    .translate(82.0, PCB_W / 2, PCB_T);
  parts.push(['target-mcu-lqfp144', mcu]);
}

// ---- ST-Link MCU: STM32F723 LQFP-48 (real STEP) --------------------------
// Local: X -4.5..4.5, Y -4.5..4.5, Z 0..1.5 (7x7 body + leads = 9x9; base Z0).
{
  const stlink = (await lib.fromSTEP('components/lqfp48.step'))
    .color(LQFP_BLACK)
    .translate(15.0, 42.0, PCB_T);
  parts.push(['stlink-mcu-lqfp48', stlink]);
}

// ---- Micro-USB connector (ST-Link, real STEP; horizontal) ----------------
// Local: X -4..4 (shell width), Y -3.8..1.6 (mouth faces local -Y), Z -0.2..2.7.
// rotate([0,0,1],-90): (x,y,z) -> (y,-x,z):
//   world X = local Y  -> mouth (local Y -3.8) lands at world X -3.8 (off edge)
//   world Y = -local X -> 8mm shell across the board, centered on rowY
//   world Z = local Z  -> body stays flat on the +Z face
// Translate +2 in X so the body sits on the PCB while the mouth overhangs X=0.
{
  const usb = (await lib.fromSTEP('components/usb_micro_b.step'))
    .rotate([0, 0, 1], -90)
    .color(USB_SILVER)
    .translate(2.0, 42.0, PCB_T);
  parts.push(['stlink-micro-usb', usb]);
}

// ---- Zio/Morpho headers: 2x19 2.54mm male (real STEP) --------------------
// Local: X -1.3..3.8 (two pin rows), Y -47..1.3 (19 positions), Z -3..8.5
// (plastic insulator local Z 0..2.5, 8.5mm mating pins up, 3mm tails down).
// Pins DOWN (task rule): flip 180 about X, then -90 about Z (template idiom).
//   rotate([1,0,0],180): (x,y,z) -> (x,-y,-z)   [long pins now at -Z]
//   rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//   combined:            (x,y,z) -> (-y,-x,-z)
//     world X = -local Y  -> pins run tx-1.3 .. tx+47 in X
//     world Y = -local X  -> two-row 5.1mm strip
//     world Z = -local Z + tz
// With headerZ = PCB_T + PLASTIC_H = 4.1, the plastic body (local Z 0..2.5)
// lands at world Z [1.6, 4.1] — bottom flush on the PCB top (1.6), proud on top.
// Long mating pins (local Z 2.5..8.5) run from Z=1.6 DOWN to Z=-4.4.
// Two headers end-to-end per side span the target-area length.
{
  const PLASTIC_H = 2.5;
  const headerZ = PCB_T + PLASTIC_H;      // 4.1 — plastic bottom flush at 1.6
  const rowStartXs = [36.0, 85.0];        // two per side, end-to-end
  const rowYs = [5.0, PCB_W - 5.0];       // ~5mm in from each long edge
  for (let e = 0; e < rowYs.length; e++) {
    for (let s = 0; s < rowStartXs.length; s++) {
      const hdr = (await lib.fromSTEP('components/pinheader_2x19.step'))
        .rotate([1, 0, 0], 180)
        .rotate([0, 0, 1], -90)
        .color(HDR_BLACK)
        .translate(rowStartXs[s], rowYs[e], headerZ);
      parts.push([`morpho-e${e}-s${s}`, hdr]);
    }
  }
}

// ---- User USB-C connector (CN1, real STEP; side edge) --------------------
// Local: X -1.5..7.4 (shell width 8.9), Y -8.6..0.5 (oval mouth faces local -Y),
// Z -2.1..3.5. Mount on the Y=0 long side edge, in the header-free ST-Link
// zone (X<34), with the mouth overhanging the edge.
//   (no Z rotation) mouth faces -Y; width runs along X (length).
// Translate Y so the mouth (local -8.6) pokes past Y=0; seat flat: Z += PCB_T.
{
  const usbc = (await lib.fromSTEP('components/usb_c.step'))
    .color(USB_SILVER)
    .translate(13.0, 7.0, PCB_T);
  parts.push(['user-usb-c', usbc]);
}

// ---- RJ45 Ethernet magjack (real STEP; bottom short edge) ----------------
// Local: X -6.8..26.5 (width 33 along X), Y -14.4..4.2 (mouth faces local -Y,
// depth axis), Z -3.6..15 (pins down, jack 15mm tall).
// rotate([0,0,1],90): (x,y,z) -> (-y,x,z):
//   world X = -local Y -> mouth (local Y -14.4) lands at world X +14.4 (outward)
//   world Y = local X  -> 33mm body across the width
//   world Z = local Z  -> pins down, body up
// Translate so the mouth overhangs the X=147 short edge and body centers on Y.
{
  const rj45 = (await lib.fromSTEP('components/rj45.step'))
    .rotate([0, 0, 1], 90)
    .color(USB_SILVER)
    .translate(150.0 - 14.4, PCB_W / 2 - 9.85, PCB_T);
  parts.push(['ethernet-rj45', rj45]);
}

// ---- Buttons: RESET (black) + USER (blue) (real STEP) --------------------
// button_tht_6mm local: X -0.4..6.7, Y -5.3..0.8, Z -3.5..4.3 (legs down, cap up).
{
  const reset = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(20.0, 63.0, PCB_T);
  parts.push(['reset-button', reset]);
  const user = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLUE)
    .translate(138.0, 12.0, PCB_T);
  parts.push(['user-button', user]);
}

// ---- Indicator LEDs LD1/LD2/LD3 (0805, real STEP; tinted) ----------------
// Local: X -1..1, Y -0.6..0.6, Z 0..1.1 (centered).
{
  const ld1 = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_GREEN)
    .translate(44.0, 60.0, PCB_T);
  parts.push(['led-ld1-green', ld1]);
  const ld2 = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_YELLOW)
    .translate(48.0, 60.0, PCB_T);
  parts.push(['led-ld2-yellow', ld2]);
  const ld3 = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_RED)
    .translate(52.0, 60.0, PCB_T);
  parts.push(['led-ld3-red', ld3]);
  const ledStl = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_GREEN)
    .translate(12.0, 52.0, PCB_T);
  parts.push(['led-stlink', ledStl]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('nucleo-h563zi-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
