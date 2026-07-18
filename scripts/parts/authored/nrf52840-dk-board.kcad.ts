// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// SPDX-License-Identifier: CC-BY-SA-4.0
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/nrf52840-dk-board.kcad.ts
//
// Nordic nRF52840-DK development board — kernelCAD model composed from REAL
// component STEP geometry (KiCad packages3D) on an original modeled PCB, using
// the same template as scripts/parts/authored/esp32-devkit-board.kcad.ts.
//
// LICENSE NOTE: because this model embeds KiCad component geometry, the model as
// a whole is distributed under CC-BY-SA-4.0 (with the KiCad library exception),
// NOT the repo's MIT. See scripts/parts/authored/components/ATTRIBUTION.md.
//
// PACKAGE STAND-IN: the real nRF52840 is an aQFN-73, which KiCad packages3D does
// not carry. We substitute a QFN-48 (QFN-48-1EP_7x7mm_P0.5mm) as a visual
// stand-in for the main SoC. Everything else is the genuine component STEP.
//
// Frame convention: board lies flat in XY, Z is the thin axis (thickness).
//   X = length (0..101.6), Y = width (0..63.5), Z = thickness (0..1.6 PCB).
// Each imported KiCad component uses Z=0 as its board-mount plane, so we seat it
// by translating Z += PCB_T (plastic body flush on the +Z PCB top, pins to -Z).
//
// Layout (X = length 0..101.6, Y = width 0..63.5):
//   - Micro-USB at the X=0 short end (shell overhangs the -X edge).
//   - 4 user buttons + 4 user LEDs in two rows near the USB end.
//   - nRF52840 SoC (QFN-48 stand-in) in the upper-centre of the board.
//   - Arduino Uno R3 female headers (1x10+1x08 digital / 1x08+1x06 power+analog)
//     as a shield footprint, plus two extra nRF-DK extension header blocks along
//     the top edge. All proud on the +Z top face.
//   - Coin-cell holder as a flat silver cylinder on the back (-Z) face.

// ---- PCB substrate (our own geometry) ------------------------------------
const PCB_L = 101.6; // X  (length)
const PCB_W = 63.5;  // Y  (width)
const PCB_T = 1.6;   // Z  (thickness — the thin axis)

// Explicit part colors — .color() takes a '#RRGGBB' STRING; a numeric 0xRRGGBB
// is NOT honored (imported STEP falls back to gray). Keep every color a string.
const PCB_BLUE    = '#1746a2'; // Nordic blue solder mask
const QFN_BLACK   = '#1a1a1a'; // nRF52840 SoC (QFN-48 stand-in)
const SOCK_BLACK  = '#18181a'; // female header plastic
const USB_SILVER  = '#c8ccd0'; // micro-USB shell
const BTN_BLACK   = '#1c1c1e'; // tactile switch body
const LED_GREEN   = '#25c02a'; // user LEDs
const COIN_SILVER = '#c8ccd0'; // coin-cell holder can

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,101.6] x [0,63.5] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_BLUE)]);

// ---- nRF52840 SoC (QFN-48 stand-in, real STEP) ---------------------------
// Local: X -3.5..3.5, Y -3.5..3.5, Z 0..0.8 (body base on the mount plane).
// Seat on the +Z top; place in the upper-centre of the board.
{
  const soc = (await lib.fromSTEP('components/qfn48.step'))
    .color(QFN_BLACK)
    .translate(58.0, 38.0, PCB_T);
  parts.push(['nrf52840', soc]);
}

// ---- Arduino / extension female headers (real PinSocket STEP) ------------
// Local (each PinSocket_1xNN_Vertical): X -1.3..1.3 (2.6mm body width),
// Y -N..1.3 (pin row along -Y), Z -3.1..8.5 (8.5mm socket body UP, 3.1mm pin
// tails DOWN). Body already points +Z and tails -Z, so NO 180° flip is needed —
// only a rotate about Z to lay the pin row along world X.
//   rotate([0,0,1],90): (x,y,z) -> (-y, x, z)
//     world X = -local Y  -> pin row runs [-1.3 .. +N] (translate to position)
//     world Y =  local X  -> 2.6mm-wide strip centred on the translate Y
//     world Z =  local Z  -> body 0..8.5 on +Z, tails to -3.1 (through the board)
// After translate Z += PCB_T the socket body base sits flush on the PCB top and
// the pin tails drop below the board.
const seatSocket = async (
  file: string,
  tx: number,
  ty: number,
  id: string,
) => {
  const s = (await lib.fromSTEP(`components/${file}`))
    .rotate([0, 0, 1], 90)
    .color(SOCK_BLACK)
    .translate(tx, ty, PCB_T);
  parts.push([id, s]);
};

// Arduino Uno R3 shield footprint: digital rows on the top long edge, power +
// analog on the bottom long edge.
await seatSocket('pinsocket_1x10.step', 46.0, 56.0, 'hdr-digital-hi');   // D8..D15
await seatSocket('pinsocket_1x08.step', 74.0, 56.0, 'hdr-digital-lo');   // D0..D7
await seatSocket('pinsocket_1x08.step', 48.0,  8.0, 'hdr-power');        // power
await seatSocket('pinsocket_1x06.step', 74.0,  8.0, 'hdr-analog');       // A0..A5

// nRF52840-DK extension headers along the top edge (extra debug/GPIO breakouts).
await seatSocket('pinsocket_1x08.step',  8.0, 61.0, 'hdr-ext-1');
await seatSocket('pinsocket_1x06.step', 30.0, 61.0, 'hdr-ext-2');

// ---- Micro-USB connector (real STEP) -------------------------------------
// Local: X -4..4 (width 8), Y -3.8..1.6 (depth, plug mouth one end), Z -0.2..2.7.
// rotate([0,0,1],90): world X = -local Y (depth onto board length), world Y = local X.
// Seat at the X=0 short end so the shell mouth overhangs the -X edge.
{
  const usb = (await lib.fromSTEP('components/usb_micro_b.step'))
    .rotate([0, 0, 1], 90)
    .color(USB_SILVER)
    .translate(-0.5, PCB_W / 2, PCB_T);
  parts.push(['micro-usb', usb]);
}

// ---- 4 user buttons (tactile 6mm, real STEP) -----------------------------
// Local: X -0.4..6.7, Y -5.3..0.8, Z -3.5..4.3 (legs down, cap up; Z0 = plane).
// A row of four near the USB end, along the bottom long edge.
{
  const btnXs = [10.0, 19.0, 28.0, 37.0];
  for (let i = 0; i < btnXs.length; i++) {
    const b = (await lib.fromSTEP('components/button_tht_6mm.step'))
      .color(BTN_BLACK)
      .translate(btnXs[i], 6.0, PCB_T);
    parts.push([`button-${i + 1}`, b]);
  }
}

// ---- 4 user LEDs (0805, real STEP; green) --------------------------------
// Local: X -1..1, Y -0.6..0.6, Z 0..1.1 (centered).
{
  const ledXs = [12.0, 21.0, 30.0, 39.0];
  for (let i = 0; i < ledXs.length; i++) {
    const l = (await lib.fromSTEP('components/led_0805.step'))
      .color(LED_GREEN)
      .translate(ledXs[i], 15.0, PCB_T);
    parts.push([`led-${i + 1}`, l]);
  }
}

// ---- Coin-cell holder (modeled, flat silver cylinder on the back) --------
// cylinder(h, r): base at Z=0, extends +Z, XY-centred. Put on the -Z (back) face
// so it protrudes below the board: base at Z=-3, top flush with the PCB bottom.
{
  const coin = cylinder(3.0, 10.0)
    .color(COIN_SILVER)
    .translate(78.0, 32.0, -3.0);
  parts.push(['coin-cell-holder', coin]);
}

// ---- Assemble ------------------------------------------------------------
const asm = assembly('nrf52840-dk-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
