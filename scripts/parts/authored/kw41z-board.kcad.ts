// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/kw41z-board.kcad.ts
//
// NXP FRDM-KW41Z Freedom development board — kernelCAD model composed from REAL
// component STEP geometry (KiCad packages3D) on an original modeled PCB.
//
// Follows the ESP32 DevKitC template (scripts/parts/authored/esp32-devkit-board.kcad.ts):
// the PCB is our own primitive slab; every populated component is a real vendor
// STEP loaded with `lib.fromSTEP(...)`, measured, then rotated/translated on.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..81), Y = width (0..53), Z = thickness (0..1.6 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T. Length axes (local Y) turn onto world X via a -90°
// rotation about Z.
//
// Layout (X = length 0..81, Y = width 0..53):
//   - Two micro-USB connectors at the X=0 short edge (OpenSDA + KW41Z target),
//     shells overhanging the edge.
//   - OpenSDA debug MCU (LQFP-48) near the USB end; KW41Z main MCU (LQFP-48)
//     centered on the board.
//   - Arduino Uno R3 female headers down both long edges: 1x10 + 1x08 on the
//     "digital" edge, 1x08 + 1x06 on the "power/analog" edge. Proud on top.
//   - RGB user LED (5050) + two green indicator LEDs (0805).
//   - RESET + two user tactile buttons.
//   - CR2032 coin-cell holder (silver round).

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 81.0; // X  (length)
const PCB_W = 53.0; // Y  (width)
const PCB_T = 1.6;  // Z  (thickness — the thin axis)

// Explicit part colors — the kernelCAD render and LabWired both key off these,
// so every composed component is tinted. .color() takes a '#RRGGBB' STRING; a
// numeric 0xRRGGBB is NOT honored (import falls back to gray).
const PCB_GREEN   = '#0e5a3a'; // NXP dark-green solder mask
const IC_BLACK    = '#1a1a1a'; // LQFP-48 epoxy body
const SOCK_BLACK  = '#18181a'; // female header plastic
const USB_SILVER  = '#c8ccd0'; // micro-USB shell
const BTN_BLACK   = '#1c1c1e'; // tactile switch body
const COIN_SILVER = '#c8ccd0'; // CR2032 holder can
const LED_RGB     = '#b060c0'; // RGB user LED (tinted)
const LED_GREEN   = '#28b828'; // 0805 indicator LEDs

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,81] x [0,53] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_GREEN)]);

// ---- MCUs: two LQFP-48 (real STEP) ---------------------------------------
// Local: X -4.5..4.5, Y -4.5..4.5 (9x9 body), Z 0..1.5 (Z0 = mount plane).
// Seat flush on the PCB top (min body Z = PCB_T); no rotation needed (square).
{
  const opensda = (await lib.fromSTEP('components/lqfp48.step'))
    .color(IC_BLACK)
    .translate(13.0, 27.0, PCB_T);
  parts.push(['opensda-mcu', opensda]);       // debug probe MCU, near USB end
  const kw41z = (await lib.fromSTEP('components/lqfp48.step'))
    .color(IC_BLACK)
    .translate(45.0, 27.0, PCB_T);
  parts.push(['kw41z', kw41z]);               // main MCU, board centre
}

// ---- Arduino Uno R3 female headers (real PinSocket STEP) ------------------
// Local: X -1.3..1.3 (2.6 wide), Y -Nmax..1.3 (pin run), Z -3.1..8.5.
// The tall female receptacle body occupies Z 0..8.5 (proud on top); short
// solder legs occupy Z 0..-3.1 (through the board, DOWN). We do NOT flip:
// rotate([0,0,1],-90) turns the pin run (local Y) onto world X, receptacle up.
//   rotate([0,0,1],-90): (x,y,z) -> (y,-x,z)
//     world X = local Y  (row runs along the board length)
//     world Y = -local X (2.6mm-wide strip, centred on Ycenter)
//     world Z = local Z  (body up, legs down)  -> translate Z += PCB_T
// Translate X by (Xstart + |Ymin|) so the far pin lands at Xstart.
{
  const seatSocket = (
    file: string, ymin_abs: number, xstart: number, ycenter: number,
  ) =>
    (async () =>
      (await lib.fromSTEP(file))
        .rotate([0, 0, 1], -90)
        .color(SOCK_BLACK)
        .translate(xstart + ymin_abs, ycenter, PCB_T))();

  const Y_DIGITAL = 50.0; // long edge nearer Y=53
  const Y_POWER   = 3.0;  // long edge nearer Y=0

  // Digital edge: 1x08 (D0-D7) + 1x10 (D8-D13, GND, AREF, SDA, SCL)
  parts.push(['hdr-digital-1x08', await seatSocket('components/pinsocket_1x08.step', 19.0, 17.0, Y_DIGITAL)]);
  parts.push(['hdr-digital-1x10', await seatSocket('components/pinsocket_1x10.step', 24.1, 43.0, Y_DIGITAL)]);
  // Power/analog edge: 1x08 (power) + 1x06 (A0-A5)
  parts.push(['hdr-power-1x08',   await seatSocket('components/pinsocket_1x08.step', 19.0, 17.0, Y_POWER)]);
  parts.push(['hdr-analog-1x06',  await seatSocket('components/pinsocket_1x06.step', 14.0, 45.0, Y_POWER)]);
}

// ---- Micro-USB connectors x2 (real STEP) ---------------------------------
// Local: X -4..4 (8 wide), Y -3.8..1.6 (depth), Z -0.2..2.7.
// rotate([0,0,1],90): (x,y,z)->(-y,x,z). world X = -local Y (depth onto length),
// world Y = local X. Seat at the X=0 short edge; shell overhangs off -X.
{
  const mkUsb = (ycenter: number) =>
    (async () =>
      (await lib.fromSTEP('components/usb_micro_b.step'))
        .rotate([0, 0, 1], 90)
        .color(USB_SILVER)
        .translate(-0.5, ycenter, PCB_T))();
  parts.push(['usb-opensda', await mkUsb(17.0)]); // OpenSDA debug/power
  parts.push(['usb-target',  await mkUsb(36.0)]); // KW41Z target (optional)
}

// ---- RESET + user buttons (tactile 6mm, real STEP) -----------------------
// Local: X -0.4..6.7, Y -5.3..0.8, Z -3.5..4.3 (legs down, cap up). Z0 = plane.
{
  const reset = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(6.0, 45.0, PCB_T);
  parts.push(['reset-button', reset]);
  const sw3 = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(6.0, 9.0, PCB_T);
  parts.push(['user-button-sw3', sw3]);
  const sw4 = (await lib.fromSTEP('components/button_tht_6mm.step'))
    .color(BTN_BLACK)
    .translate(70.0, 9.0, PCB_T);
  parts.push(['user-button-sw4', sw4]);
}

// ---- RGB user LED (5050, real STEP) --------------------------------------
// Local: X -2.7..2.7, Y -2.5..2.5, Z 0..1.6 (centered, Z0 = plane).
{
  const rgb = (await lib.fromSTEP('components/led_5050.step'))
    .color(LED_RGB)
    .translate(60.0, 40.0, PCB_T);
  parts.push(['rgb-led', rgb]);
}

// ---- Green indicator LEDs (0805, real STEP) ------------------------------
// Local: X -1..1, Y -0.6..0.6, Z 0..1.1 (centered).
{
  const led1 = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_GREEN)
    .translate(53.0, 40.0, PCB_T);
  parts.push(['led-green-1', led1]);
  const led2 = (await lib.fromSTEP('components/led_0805.step'))
    .color(LED_GREEN)
    .translate(56.0, 40.0, PCB_T);
  parts.push(['led-green-2', led2]);
}

// ---- CR2032 coin-cell holder (our own geometry: silver round can) --------
// cylinder(height, radius, segments), base at Z=0 -> seat on PCB top.
{
  const coin = cylinder(3.2, 9.0, 48)
    .color(COIN_SILVER)
    .translate(70.0, 30.0, PCB_T);
  parts.push(['coin-cell-holder', coin]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('kw41z-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
