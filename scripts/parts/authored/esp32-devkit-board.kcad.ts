// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/esp32-devkit-board.kcad.ts
//
// ESP32 DevKitC / DevKit V1 development board — kernelCAD model composed from
// REAL component STEP geometry (KiCad packages3D) on an original modeled PCB.
//
// This is the TEMPLATE every other authored board follows: the PCB is our own
// primitive slab; every populated component is a real vendor STEP loaded with
// `lib.fromSTEP(...)`, measured, then rotated/translated onto the board.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..52), Y = width (0..28), Z = thickness (0..1.6 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T. Component length axes (local Y) are turned onto the
// board X axis with a ±90° rotation about Z.
//
// Layout (X = length 0..52, Y = width 0..28):
//   - Micro-USB at the X=0 short end (shell overhangs the edge).
//   - EN + BOOT tactile buttons + AMS1117 regulator + crystal + LEDs near USB.
//   - ESP32-WROOM-32 module near the X=52 end; its antenna overhangs the far
//     short edge by ~6mm.
//   - Two 19-pin 2.54mm header rows down both long edges, ~2mm in from the edge,
//     pins protruding through the board to -Z.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 52.0; // X  (length)
const PCB_W = 28.0; // Y  (width)
const PCB_T = 1.6;  // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render and LabWired both key off these,
// so every composed component is tinted (imported STEP would otherwise be gray).
// NOTE: .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB is NOT honored
// (the imported STEP falls back to gray). Keep every color a string.
const PCB_GREEN   = '#14653a'; // solder-mask green
const WROOM_STEEL = '#b8bcc0'; // brushed-steel shield can
const HDR_BLACK   = '#18181a'; // header plastic (dominates the top view)
const USB_SILVER  = '#c8ccd0'; // micro-USB shell
const BTN_BLACK   = '#1c1c1e'; // tactile switch body
const IC_BLACK    = '#1a1a1a'; // SOT-223 (AMS1117)
const XTAL_METAL  = '#b0b4b8'; // crystal SMD can
const LED_RED     = '#d02424';
const LED_BLUE    = '#2a52d8';

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,52] x [0,28] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_GREEN)]);

// ---- ESP32-WROOM-32 module (real STEP) -----------------------------------
// Local: X -9..9 (width 18), Y -9.8..15.7 (length 25.5, antenna at +Y), Z 0..3.1.
// rotate([0,0,1],-90): local +Y (length/antenna) -> world +X; local X -> world Y.
// After rotation world X spans -9.8..15.7, world Y spans -9..9.
// Translate so antenna tip (world X 15.7) lands at X=58 (6mm overhang past 52),
// and width centers across the board (world Y -> 5..23).
{
  const wroom = (await lib.fromSTEP('components/esp32_wroom32.step'))
    .rotate([0, 0, 1], -90)
    .color(WROOM_STEEL)
    .translate(58 - 15.7, PCB_W / 2, PCB_T);
  parts.push(['esp32-wroom-32', wroom]);
}

// ---- Header rows: two 1x19 2.54mm (real STEP) ----------------------------
// Local: X -1.3..1.3 (body width 2.6), Y 0..-47 (19 pins), Z -3..8.5 (8.5mm long
// mating pins one side, 3mm tail the other, 2.5mm plastic strip at the base).
// DevKitC ships with the LONG pins pointing DOWN (breadboard style), so flip the
// header 180° about X to send the 8.5mm pins to -Z (below the board) and leave
// mostly the black plastic strip on top.
//   rotate([1,0,0],180): (x,y,z) -> (x,-y,-z)   [long pins now at -Z]
//   rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//   combined:            (x,y,z) -> (-y,-x,-z)   then translate(rowStartX, rowY, tz)
//     world X = -local Y  -> pins run 0..+45.7 in X (centered on the 52mm board)
//     world Y = -local X  -> 2.6mm-wide strip
//     world Z = -local Z + tz
// The 2.5mm plastic insulator is at local Z 0..2.5 (KiCad seats the insulator on
// the Z=0 plane), so after the flip it lands at world Z [tz-2.5, tz]. Raise the
// header by PLASTIC_H above the board top (tz = PCB_T + PLASTIC_H = 4.1) so the
// plastic body's BOTTOM is flush with the PCB top (Z=1.6) and it stands proud to
// Z=4.1 — a visible ~2.5mm black strip above the green. The long mating pins
// (local Z 2.5..8.5) then run from Z=1.6 DOWN to Z=-4.4 (through and below the
// board); the short solder tails (local Z -3..0) poke up to Z=7.1.
{
  const PLASTIC_H = 2.5;                      // insulator height (local Z 0..2.5)
  const headerZ = PCB_T + PLASTIC_H;          // 4.1 — plastic bottom flush at 1.6
  const rowStartX = (PCB_L - 18 * 2.54) / 2;  // 3.14, centered on length
  const rowYs = [2.0, PCB_W - 2.0];           // ~2mm in from each long edge
  for (let r = 0; r < rowYs.length; r++) {
    const hdr = (await lib.fromSTEP('components/pinheader_1x19.step'))
      .rotate([1, 0, 0], 180)
      .rotate([0, 0, 1], -90)
      .color(HDR_BLACK)
      .translate(rowStartX, rowYs[r], headerZ);
    parts.push([`header-row-${r}`, hdr]);
  }
}

// ---- Micro-USB connector (real STEP) -------------------------------------
// Local: X -4..4 (width 8), Y -3.8..1.6 (depth), Z -0.2..2.7 (height; body already
// lies flat with mounting tabs at the low-Z side). The receptacle MOUTH (the open
// shroud) faces local -Y. To aim it off the X=0 short edge we send local -Y to
// world -X with rotate([0,0,1],-90): (x,y,z) -> (y,-x,z):
//   world X = local Y  -> mouth (local Y -3.8) lands at world X -3.8 (off the edge)
//   world Y = -local X -> 8mm shell width across the board, centered
//   world Z = local Z  -> body stays flat on the +Z face (no up/into-board tilt)
// Translate +2 in X so the mounting body sits on the PCB while the mouth overhangs.
{
  const usb = (await lib.fromSTEP('components/usb_micro_b.step'))
    .rotate([0, 0, 1], -90)
    .color(USB_SILVER)
    .translate(2.0, PCB_W / 2, PCB_T);
  parts.push(['micro-usb', usb]);
}

// ---- EN + BOOT tactile buttons (real STEP) -------------------------------
// Local: X -0.4..6.7, Y -5.3..0.8, Z -3.5..4.3 (legs down, cap up). Z0 = plane.
// Place both near the USB end, on opposite long edges.
{
  const en = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(4.0, 8.0, PCB_T);
  parts.push(['en-button', en]);
  const boot = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(4.0, 24.0, PCB_T);
  parts.push(['boot-button', boot]);
}

// ---- AMS1117 3.3V regulator (SOT-223, real STEP) -------------------------
// Local: X -3.5..3.5, Y -3.3..3.3, Z 0..1.7 (centered).
{
  const ams = (await lib.fromSTEP('components/sot223.step'))
    .color(IC_BLACK)
    .translate(17.0, 14.0, PCB_T);
  parts.push(['ams1117', ams]);
}

// ---- Crystal (SMD 3225, real STEP) ---------------------------------------
// Local: X -1.6..1.6, Y -1.3..1.2, Z 0..0.6 (centered).
{
  const xtal = (await lib.fromSTEP('components/crystal_smd_3225.step'))
    .color(XTAL_METAL)
    .translate(24.0, 14.0, PCB_T);
  parts.push(['crystal', xtal]);
}

// ---- Indicator LEDs (0805, real STEP; tinted red power / blue user) ------
// Local: X -1..1, Y -0.6..0.6, Z 0..1.1 (centered).
{
  const ledPwr = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_RED)
    .translate(12.0, 21.0, PCB_T);
  parts.push(['led-power', ledPwr]);
  const ledUsr = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_BLUE)
    .translate(12.0, 7.0, PCB_T);
  parts.push(['led-user', ledUsr]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('esp32-devkit-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
