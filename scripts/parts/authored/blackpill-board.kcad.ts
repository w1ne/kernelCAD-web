// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/blackpill-board.kcad.ts
//
// WeAct STM32 BlackPill (STM32F4x1) development board — kernelCAD model composed
// from REAL component STEP geometry (KiCad packages3D) on an original modeled PCB.
//
// Follows the ESP32 DevKitC template (esp32-devkit-board.kcad.ts) EXACTLY: the PCB
// is our own primitive slab; every populated component is a real vendor STEP loaded
// with `lib.fromSTEP(...)`, measured, then rotated/translated onto the board.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as a
// whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception), NOT
// the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..53), Y = width (0..21), Z = thickness (0..1.6 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it by
// translating Z += PCB_T. Header pin rows are turned onto the board X axis with the
// same 180°-about-X + -90°-about-Z flip as the ESP32 template so the long mating
// pins point DOWN (below board) and the black plastic strip stays proud on +Z.
//
// Layout (X = length 0..53, Y = width 0..21):
//   - USB-C at the X=0 short end (mouth overhangs the edge).
//   - STM32F4x1 LQFP-48 centered.
//   - Two 2x20 male headers down both long edges (plastic proud on top, pins down).
//   - NRST + BOOT0 + KEY tactile buttons, 25MHz HC49 + 32.768kHz SMD crystals,
//     SOIC-8 SPI flash, blue user LED + red power LED packed in the middle strip.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 53.0; // X  (length)
const PCB_W = 21.0; // Y  (width)
const PCB_T = 1.6;  // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render and LabWired both key off these, so
// every composed component is tinted (imported STEP would otherwise be gray).
// NOTE: .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB is NOT honored
// (the imported STEP falls back to gray). Keep every color a string.
const PCB_BLACK   = '#1a1a1a'; // "BlackPill" solder mask
const LQFP_BLACK  = '#1a1a1a'; // STM32F4x1 LQFP-48 body
const HDR_BLACK   = '#18181a'; // header plastic (dominates the top view)
const USB_SILVER  = '#c8ccd0'; // USB-C shell
const BTN_BLACK   = '#1c1c1e'; // tactile switch body
const FLASH_BLACK = '#1a1a1a'; // SOIC-8 SPI flash
const XTAL_METAL  = '#b0b4b8'; // crystal metal can
const LED_RED     = '#d02424'; // power LED
const LED_BLUE    = '#2a52d8'; // user LED

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,53] x [0,21] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_BLACK)]);

// ---- STM32F4x1 (LQFP-48, real STEP) --------------------------------------
// Local: X -4.5..4.5, Y -4.5..4.5, Z 0..1.5 (centered; leads in the bbox).
// Sits flat, centered on the board between the two header rows.
{
  const mcu = (await lib.fromSTEP('components/lqfp48.step'))
    .color(LQFP_BLACK)
    .translate(PCB_L / 2, PCB_W / 2, PCB_T);
  parts.push(['stm32f4x1', mcu]);
}

// ---- Header rows: two 2x20 2.54mm (real STEP) ----------------------------
// Local: X -1.27..3.81 (2-row strip width 5.08), Y -49.53..1.27 (20 pins, 50.8),
// Z -3..8.54 (8.54mm long mating pins one side, 3mm tail the other).
// Same flip as the ESP32 template so the LONG pins point DOWN (breadboard style):
//   rotate([1,0,0],180): (x,y,z) -> (x,-y,-z)   [long pins now at -Z]
//   rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//     world X = post-flip Y  -> the 20-pin run along the board length
//     world Y = -post-flip X -> the 5.08mm-wide 2-row strip
//     world Z = -local Z     -> long pins to Z<0 (below board)
// SEATING: the KiCad insulator (2.54mm thick) is on the SAME local side as the
// long mating pins, so after the 180° flip it hangs BELOW the pin-exit face. To
// seat the plastic flush ON the +Z board top (min Z = PCB_T, up to ~4.14) with the
// long pins passing DOWN through it, we lift Z by PCB_T + PLASTIC_T (not just
// PCB_T — that would sink the whole insulator into the slab).
{
  const PLASTIC_T = 2.54; // insulator strip thickness (measured from the STEP)
  // Center the 50.8mm pin run on the 53mm length: rotated X spans [-1.27, 49.53],
  // so tx + 24.13 = 26.5 -> tx = 2.37.
  const rowStartX = 2.37;
  // Header body (post-transform Y span [-3.81, 1.27], center -1.27) placed so the
  // two rows hug each long edge: body centers at ~2.7 and ~18.3.
  const rowYs = [3.97, 19.57];
  for (let r = 0; r < rowYs.length; r++) {
    const hdr = (await lib.fromSTEP('components/pinheader_2x20.step'))
      .rotate([1, 0, 0], 180)
      .rotate([0, 0, 1], -90)
      .color(HDR_BLACK)
      .translate(rowStartX, rowYs[r], PCB_T + PLASTIC_T);
    parts.push([`header-row-${r}`, hdr]);
  }
}

// ---- USB-C receptacle (real STEP) ----------------------------------------
// Local: X -1.5..7.45, Y -8.61..0.56 (depth; oval mouth faces -Y), Z -2.11..3.45
// (through-hole legs to -Z, body to +Z).
// rotate([0,0,1],-90): (x,y,z) -> (y,-x,z). local -Y (mouth) -> world -X, so the
// mouth points off the X=0 short edge. Translate so the mouth tip overhangs ~2mm
// past X=0 and the body centers across the width.
{
  const usb = (await lib.fromSTEP('components/usb_c.step'))
    .rotate([0, 0, 1], -90)
    .color(USB_SILVER)
    .translate(6.61, 13.475, PCB_T);
  parts.push(['usb-c', usb]);
}

// ---- Tactile buttons: NRST + BOOT0 + KEY (real STEP) ---------------------
// Local: X -0.44..6.74, Y -5.25..0.75, Z -3.5..4.3 (legs down, cap up; Z0 = plane;
// body center ~ (3.15, -2.25)). Packed in the middle strip clear of the headers.
{
  const nrst = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(7.85, 11.25, PCB_T); // body center ~ (11, 9)
  parts.push(['btn-nrst', nrst]);
  const boot0 = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(15.35, 11.25, PCB_T); // body center ~ (18.5, 9)
  parts.push(['btn-boot0', boot0]);
  const key = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(44.85, 11.25, PCB_T); // body center ~ (48, 9)
  parts.push(['btn-key', key]);
}

// ---- 25MHz HSE crystal (flat SMD, real STEP) ------------------------------
// Real WeAct BlackPills use a compact SMD crystal here, not a tall HC49 can —
// a 13mm can towers over the 21mm-wide board. Flat SMD 3225, seated near the MCU.
{
  const hse = (await lib.fromSTEP('components/crystal_smd_3225.step'))
    .color(XTAL_METAL)
    .translate(37.0, 8.0, PCB_T);
  parts.push(['crystal-25mhz', hse]);
}

// ---- 32.768kHz LSE crystal (SMD 3225, real STEP) -------------------------
// Local: X -1.6..1.6, Y -1.25..1.25, Z 0..0.64 (centered).
{
  const lse = (await lib.fromSTEP('components/crystal_smd_3225.step'))
    .color(XTAL_METAL)
    .translate(13.0, 13.5, PCB_T);
  parts.push(['crystal-32khz', lse]);
}

// ---- SPI flash (SOIC-8, real STEP) ---------------------------------------
// Local: X -3..3, Y -2.45..2.45, Z 0..1.75 (centered).
{
  const flash = (await lib.fromSTEP('components/soic8.step'))
    .color(FLASH_BLACK)
    .translate(37.0, 13.0, PCB_T);
  parts.push(['spi-flash', flash]);
}

// ---- Indicator LEDs (0805, real STEP; blue user / red power) -------------
// Local: X -1..1, Y -0.63..0.63, Z 0..1.1 (centered).
{
  const ledUsr = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_BLUE)
    .translate(44.0, 13.5, PCB_T);
  parts.push(['led-user', ledUsr]);
  const ledPwr = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_RED)
    .translate(48.0, 14.0, PCB_T);
  parts.push(['led-power', ledPwr]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('blackpill-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
