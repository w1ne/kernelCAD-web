// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/esp32-s3-zero-board.kcad.ts
//
// Waveshare ESP32-S3-Zero development board — kernelCAD model composed from
// REAL component STEP geometry (KiCad packages3D) on an original modeled PCB.
//
// Follows the esp32-devkit-board.kcad.ts template: the PCB is our own primitive
// slab; every populated component is a real vendor STEP loaded with
// `lib.fromSTEP(...)`, measured (via `inspect step`), then rotated/translated
// onto the board.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..25), Y = width (0..24), Z = thickness (0..1.0 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T. Component length axes (local Y) are turned onto the
// board X axis with a ±90° rotation about Z.
//
// The ESP32-S3-Zero is tiny and dense: the ESP32-S3-WROOM-1 module (25.5mm long)
// spans nearly the whole 25mm board. The module's antenna overhangs one short
// edge; the USB-C, WS2812 RGB LED and BOOT/RESET buttons sit at the opposite
// short edge; two rows of castellated GPIO pads (rendered as proud 1x9 header
// strips) run down the long edges.
//
// Layout (X = length 0..25, Y = width 0..24):
//   - USB-C at the X=0 short end (mouth overhangs the edge).
//   - WS2812 RGB LED + BOOT/RESET buttons in the clear zone near the USB end.
//   - ESP32-S3-WROOM-1 module fills the board; antenna overhangs the X=25 edge.
//   - Two 1x9 2.54mm header strips down both long edges (castellated GPIO),
//     plastic proud on the +Z face, long pins protruding down to -Z.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 25.0; // X  (length)
const PCB_W = 24.0; // Y  (width)
const PCB_T = 1.0;  // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render and LabWired both key off these,
// so every composed component is tinted (imported STEP would otherwise be gray).
// NOTE: .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB is NOT honored.
const PCB_BLACK   = '#141414'; // black solder mask (Waveshare)
const WROOM_STEEL = '#b8bcc0'; // brushed-steel WROOM-1 shield can
const HDR_BLACK   = '#18181a'; // header plastic / castellated strip
const USB_SILVER  = '#c8ccd0'; // USB-C shell
const BTN_BLACK   = '#1c1c1e'; // BOOT / RESET switch body
const LED_TINT    = '#3fb6c8'; // WS2812 RGB LED lens (tinted cyan)

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,25] x [0,24] x [0,1.0]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_BLACK)]);

// ---- ESP32-S3-WROOM-1 module (real STEP) ---------------------------------
// Local: X -9..9 (width 18), Y -12.8..12.8 (length 25.6, PCB antenna at +Y, the
// shield can only reaches +Y 5.9), Z 0..3.1.
// rotate([0,0,1],-90): (x,y,z) -> (y,-x,z).  world X = local Y (length/antenna),
//   world Y = -local X (width).
//   After rotation world X spans -12.8..12.8, world Y spans -9..9.
// Translate X so the antenna tip (world X 12.8) overhangs the X=25 short edge by
//   ~6.6mm (tip at 31.6), leaving the X<6 zone clear for USB/LED/buttons.
// Translate Y by PCB_W/2 to centre the 18mm width on the 24mm board (Y 3..21).
{
  const wroom = (await lib.fromSTEP('components/esp32_s3_wroom1.step'))
    .rotate([0, 0, 1], -90)
    .color(WROOM_STEEL)
    .translate(18.8, PCB_W / 2, PCB_T);
  parts.push(['esp32-s3-wroom-1', wroom]);
}

// ---- Header rows: two 1x9 2.54mm (real STEP, castellated GPIO) ------------
// Local: X -1.3..1.3 (body width 2.6), Y -21.6..1.3 (9 pins), Z -3..8.5 (8.5mm
// long mating pins one side, 3mm tail the other, plastic strip at the base).
// Flip 180 about X to send the 8.5mm pins to -Z (below the board), matching the
// devkit template so the black plastic strip stands proud on the +Z face:
//   rotate([1,0,0],180): (x,y,z) -> (x,-y,-z)   [long pins now at -Z]
//   rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//   combined:            (x,y,z) -> (-y,-x,-z)
//     world X = -local Y  -> 9-pin field runs -1.3..21.6 in X
//     world Y = -local X  -> 2.6mm-wide strip
//     world Z = -local Z  -> long pins to Z<0 (below board), plastic on +Z face
// Seat Z at PCB_T+2.5 so the 2.5mm plastic strip stands proud ON the top surface
// (plastic min Z = PCB_T) with the long mating pins protruding down below Z=0.
{
  const rowStartX = 2.35;               // centres the pin field on the 25mm length
  const rowYs = [1.6, PCB_W - 1.6];     // ~1.6mm in from each long edge
  for (let r = 0; r < rowYs.length; r++) {
    const hdr = (await lib.fromSTEP('components/pinheader_1x09.step'))
      .rotate([1, 0, 0], 180)
      .rotate([0, 0, 1], -90)
      .color(HDR_BLACK)
      .translate(rowStartX, rowYs[r], PCB_T + 2.5);
    parts.push([`header-row-${r}`, hdr]);
  }
}

// ---- USB-C receptacle (real STEP) ----------------------------------------
// Local: X -1.5..7.4 (width 8.9), Y -8.6..0.6 (depth; front/mouth at +Y 0.6,
//   board pegs at -Y), Z -2.1..3.5.
// rotate([0,0,1],90): (x,y,z) -> (-y,x,z).  world X = -local Y (depth onto board
//   length), world Y = local X.
//   Front/mouth (local Y 0.6) -> world X -0.6 (overhangs the X=0 short edge);
//   back (local Y -8.6) -> world X 8.6 (on board).
// This receptacle STEP is ~9mm deep, so translate X by -3.5 to overhang the
//   mouth ~4mm off the X=0 edge and pull the back to X 5.1 — clear of the module
//   (which starts at X 6.0). Centre the 8.9mm width across the board (Y 7.6..16.5).
{
  const usb = (await lib.fromSTEP('components/usb_c.step'))
    .rotate([0, 0, 1], 90)
    .color(USB_SILVER)
    .translate(-3.5, PCB_W / 2 - 2.95, PCB_T);
  parts.push(['usb-c', usb]);
}

// ---- WS2812 RGB LED (real STEP, 5050 PLCC4) ------------------------------
// Local: X -2.7..2.7, Y -2.5..2.5, Z 0..1.6 (centred). Seat flat in the USB-end
// component strip, offset off the USB-C centreline (into the lower-Y half) so it
// isn't buried under the connector; stays clear of the module (starts at X 6.0).
{
  const led = (await lib.fromSTEP('components/led_5050.step'))
    .color(LED_TINT)
    .translate(3.0, 5.3, PCB_T);
  parts.push(['ws2812', led]);
}

// ---- BOOT + RESET buttons (small SMD side switches, modeled boxes) --------
// The S3-Zero's BOOT/RESET are tiny SMD tactiles; the real 6mm THT button STEP
// is far too big, so model them as small proud boxes, side by side in the free
// upper-Y pocket of the USB-end strip (clear of USB-C, headers and module).
{
  const reset = box(2, 2, 1.4).color(BTN_BLACK).translate(0.8, 17.8, PCB_T);
  parts.push(['reset-button', reset]);
  const boot = box(2, 2, 1.4).color(BTN_BLACK).translate(3.5, 17.8, PCB_T);
  parts.push(['boot-button', boot]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('esp32-s3-zero-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
