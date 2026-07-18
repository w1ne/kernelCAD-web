// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/esp32-c3-supermini-board.kcad.ts
//
// ESP32-C3 SuperMini development board — kernelCAD model composed from REAL
// component STEP geometry (KiCad packages3D) on an original modeled PCB.
//
// Follows the esp32-devkit-board.kcad.ts template: the PCB is our own primitive
// slab; every populated component is a real vendor STEP loaded with
// `lib.fromSTEP(...)`, measured, then rotated/translated onto the board. Two
// components have no KiCad equivalent and are hand-modeled boxes (noted inline):
// the ceramic chip antenna and the tiny BOOT/RESET side buttons.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..22.5), Y = width (0..18), Z = thickness (0..1.0 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T.
//
// Layout (X = length 0..22.5, Y = width 0..18):
//   - USB-C at the X=0 short end, receptacle mouth overhanging the -X edge.
//   - ESP32-C3 (QFN-32) centered on the board.
//   - Ceramic chip antenna overhanging the far X=22.5 short edge.
//   - Two 1x8 2.54mm header rows down both long edges (plastic proud on the +Z
//     top face, long mating pins protruding through the board to -Z).
//   - WS2812 RGB LED + tiny power LED + BOOT/RESET side buttons.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 22.5; // X  (length)
const PCB_W = 18.0; // Y  (width)
const PCB_T = 1.0;  // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render and LabWired both key off these,
// so every composed component is tinted (imported STEP would otherwise be gray).
// NOTE: .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB is NOT honored.
const PCB_BLUE    = '#1b2a4a'; // dark-blue solder mask (SuperMini)
const QFN_BLACK   = '#1a1a1a'; // ESP32-C3 QFN-32 epoxy body
const HDR_BLACK   = '#18181a'; // header plastic
const USB_SILVER  = '#c8ccd0'; // USB-C shell
const ANT_OFFWHITE= '#e8e4d8'; // ceramic chip antenna
const LED_RGBWHITE= '#cfd8dc'; // WS2812 RGB LED (clear/white body, faint tint)
const LED_RED     = '#d02424'; // power LED (0805)
const BTN_BLACK   = '#1c1c1e'; // BOOT / RESET side buttons

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,22.5] x [0,18] x [0,1.0]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_BLUE)]);

// ---- ESP32-C3 (QFN-32, real STEP) ----------------------------------------
// Local: X -2.5..2.5, Y -2.5..2.5, Z 0..0.8 (centered, Z0 = mount plane).
// Symmetric footprint — no rotation needed. Seat centered on the board top.
{
  const c3 = (await lib.fromSTEP('components/qfn32.step'))
    .color(QFN_BLACK)
    .translate(PCB_L / 2, PCB_W / 2, PCB_T - 0.15); // embed 0.15mm for pad contact
  parts.push(['esp32-c3', c3]);
}

// ---- Header rows: two 1x8 2.54mm (real STEP) -----------------------------
// Local: X -1.3..1.3 (body width 2.6), Y -19..1.3 (8 pins along -Y), Z -3..8.5
// (8.5mm long mating pins one side, 3mm tail the other, plastic strip at base).
// Same breadboard-style seating as the DevKit template: flip 180 about X so the
// long 8.5mm pins point DOWN (below the board) and the plastic strip is proud on
// the +Z top face.
//   rotate([1,0,0],180): (x,y,z) -> (x,-y,-z)   [long pins now at -Z]
//   rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//   combined:            (x,y,z) -> (-y,-x,-z)
//     world X = -local Y  -> body runs -1.3..+19 in X (centered on the 22.5 board)
//     world Y = -local X  -> 2.6mm-wide strip
//     world Z = -local Z  -> long pins to Z<0 (below board), plastic on +Z face
// The 180 flip also inverts the ~2.5mm plastic strip (local Z 0..2.5), so a bare
// +PCB_T translate would sink it below the top face. Lift by the plastic height
// (HDR_PLASTIC_H) so the plastic bottom seats flush ON the PCB top (min Z=PCB_T),
// the long mating pins reach through to -Z, and the short tail stubs sit proud.
{
  const HDR_PLASTIC_H = 2.5; // plastic strip height (local Z 0..2.5)
  const rowStartX = (PCB_L - 7 * 2.54) / 2 - 1.3; // center the 8-pin span on X
  const rowYs = [2.5, PCB_W - 2.5]; // ~2.5mm in from each long edge
  for (let r = 0; r < rowYs.length; r++) {
    const hdr = (await lib.fromSTEP('components/pinheader_1x08.step'))
      .rotate([1, 0, 0], 180)
      .rotate([0, 0, 1], -90)
      .color(HDR_BLACK)
      .translate(rowStartX, rowYs[r], PCB_T + HDR_PLASTIC_H);
    parts.push([`header-row-${r}`, hdr]);
  }
}

// ---- USB-C receptacle (real STEP) ----------------------------------------
// Local: X -1.5..7.4, Y -8.6..0.5 (receptacle depth; mouth opening at -Y,
// board pins near Y=0), Z -2.1..3.5.
// rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//   world X = local Y  -> -8.6..0.5 (mouth at -X, pins/back at +X)
//   world Y = -local X -> -7.4..1.5 (8.9mm wide)
// Seat at the X=0 short end so the receptacle mouth overhangs the -X edge and the
// body sits on the board; center across the width.
{
  const usb = (await lib.fromSTEP('components/usb_c.step'))
    .rotate([0, 0, 1], -90)
    .color(USB_SILVER)
    .translate(8.0, PCB_W / 2 + 2.95, PCB_T);
  parts.push(['usb-c', usb]);
}

// ---- Ceramic chip antenna (hand-modeled box; no KiCad part) --------------
// Real SuperMini ships a ~3.2x1.6x0.5mm off-white ceramic chip antenna hanging
// over the far short edge. Modeled as a small box overhanging the X=22.5 edge.
{
  const ant = box(3.2, 1.6, 0.5)
    .color(ANT_OFFWHITE)
    .translate(20.5, PCB_W / 2 - 0.8, PCB_T - 0.2); // X 20.5..23.7 (1.2mm overhang); embed 0.2mm for pad contact
  parts.push(['antenna', ant]);
}

// ---- WS2812 RGB LED (5050, real STEP) ------------------------------------
// Local: X -2.7..2.7, Y -2.5..2.5, Z 0..1.6 (centered, Z0 = mount plane).
{
  const ws = (await lib.fromSTEP('components/led_5050.step'))
    .color(LED_RGBWHITE)
    .translate(17.5, PCB_W / 2, PCB_T - 0.15);
  parts.push(['ws2812', ws]);
}

// ---- Power LED (0805, real STEP; tinted red) -----------------------------
// Local: X -1..1, Y -0.6..0.6, Z 0..1.1 (centered).
{
  const led = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_RED)
    .translate(11.25, 13.5, PCB_T - 0.15);
  parts.push(['led-power', led]);
}

// ---- BOOT / RESET side buttons (hand-modeled boxes) ----------------------
// SuperMini uses tiny ~2.5x1.5mm SMD side buttons; the KiCad 6mm THT switch is
// far too large, so model each as a small black box near the USB end.
{
  const boot = box(2.5, 1.5, 1.2)
    .color(BTN_BLACK)
    .translate(10.0, 4.5, PCB_T - 0.2);
  parts.push(['boot-button', boot]);
  const reset = box(2.5, 1.5, 1.2)
    .color(BTN_BLACK)
    .translate(14.5, 13.0, PCB_T - 0.2);
  parts.push(['reset-button', reset]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('esp32-c3-supermini-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
