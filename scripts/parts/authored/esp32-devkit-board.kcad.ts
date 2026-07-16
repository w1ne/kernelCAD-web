// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/esp32-devkit-board.kcad.ts
//
// ESP32 DevKitC / DevKit V1 development board — ORIGINAL kernelCAD model.
// Authored from public mechanical dimensions (the vendor STEP is unlicensed),
// so this geometry is ours outright.
//
// Overall footprint: ~52 (X, length) x 28 (Y, width) x 1.6mm PCB, with the
// ESP32-WROOM-32 module + USB + headers standing on the +Z face and the header
// pins protruding to -Z (through-hole). Z is the thin axis (board lies flat in
// XY) — LabWired expects boards thin-on-Z.
//
// Layout (X = length 0..52, Y = width 0..28):
//   - Micro-USB at the X=0 short end (overhangs the edge).
//   - EN + BOOT tactile buttons + AMS1117 regulator + LEDs/passives near USB.
//   - ESP32-WROOM-32 module near the X=52 end; its PCB-trace antenna strip
//     overhangs the far short edge by ~6mm.
//   - Two 19-pin 2.54mm header rows down both long edges, ~2mm in from each edge.

// ---- PCB substrate -------------------------------------------------------
const PCB_L = 52.0; // X  (length)
const PCB_W = 28.0; // Y  (width)
const PCB_T = 1.6;  // Z  (thickness — the thin axis)

const PCB_GREEN   = '#14653a'; // solder-mask green
const CAN_SILVER  = '#c6cace'; // WROOM metal shield can
const MOD_PCB     = '#242428'; // module fiberglass substrate
const ANT_COPPER  = '#b0803a'; // PCB-trace antenna meander
const HDR_BLACK   = '#18181c'; // header plastic
const PIN_GOLD    = '#c8a848'; // header pins
const USB_SILVER  = '#b8bcc0'; // micro-USB shell
const BTN_BODY    = '#28282c'; // tact-switch body
const BTN_CAP     = '#4c4c54'; // tact-switch actuator
const IC_DARK     = '#1a1a1e'; // AMS1117 / ICs
const PASSIVE_TAN = '#7a6038'; // 0805 passives
const LED_RED     = '#d02424';
const LED_BLUE    = '#2a52d8';

const parts: [string, Shape][] = [];

// PCB slab (corner-anchored: spans [0,52] x [0,28] x [0,1.6]).
parts.push(['pcb', box(PCB_L, PCB_W, PCB_T).color(PCB_GREEN)]);

// ---- ESP32-WROOM-32 module ----------------------------------------------
// Module substrate: 25.5 (X) x 18 (Y) x 0.9, overhanging the X=52 edge by 6mm
// so its antenna strip hangs off the board (as on the real DevKitC).
const MOD_LEN = 25.5; // X
const MOD_W   = 18.0; // Y
const MOD_SUB_T = 0.9;
const CAN_LEN = 18.0; // metal shield covers the inner 18mm; the rest is antenna
const CAN_T   = 2.2;
const modY = (PCB_W - MOD_W) / 2;      // 5.0 — centered across the width
const modX = PCB_L + 6 - MOD_LEN;      // 32.5 — antenna end at X=58, 6mm overhang

parts.push(['wroom-substrate',
  box(MOD_LEN, MOD_W, MOD_SUB_T).color(MOD_PCB).translate(modX, modY, PCB_T)]);
parts.push(['wroom-shield-can',
  box(CAN_LEN, MOD_W, CAN_T).color(CAN_SILVER).translate(modX, modY, PCB_T + MOD_SUB_T)]);
// PCB-trace antenna: the exposed copper strip on the overhanging end.
parts.push(['wroom-antenna',
  box(MOD_LEN - CAN_LEN - 0.5, MOD_W - 4, 0.2)
    .color(ANT_COPPER)
    .translate(modX + CAN_LEN + 0.5, modY + 2, PCB_T + MOD_SUB_T)]);

// ---- Header rows (19 pins x 2 sides, 2.54mm pitch) -----------------------
const PIN_COUNT = 19;
const PITCH = 2.54;
const rowSpan = (PIN_COUNT - 1) * PITCH;              // 45.72
const rowStartX = (PCB_L - rowSpan) / 2;              // 3.14 — centered on length
const HDR_BODY_W = 2.4;                               // Y extent of plastic strip
const HDR_BODY_H = 2.5;
const rowYs = [2.0, PCB_W - 2.0];                     // ~2mm in from each long edge

rowYs.forEach((rowY, r) => {
  // black plastic strip
  parts.push([`header-${r}-body`,
    box(rowSpan + 3, HDR_BODY_W, HDR_BODY_H)
      .color(HDR_BLACK)
      .translate(rowStartX - 1.5, rowY - HDR_BODY_W / 2, PCB_T)]);
  // gold pins — square posts through the board, protruding ~3mm to -Z
  for (let i = 0; i < PIN_COUNT; i++) {
    const px = rowStartX + i * PITCH;
    parts.push([`header-${r}-pin-${i}`,
      box(0.64, 0.64, 8.0)
        .color(PIN_GOLD)
        .translate(px - 0.32, rowY - 0.32, -3.0)]);
  }
});

// ---- Micro-USB connector (X=0 end, slight overhang) ----------------------
const USB_DEPTH = 5.5; // X
const USB_WIDTH = 7.5; // Y
const USB_H = 2.6;
parts.push(['micro-usb',
  box(USB_DEPTH, USB_WIDTH, USB_H)
    .color(USB_SILVER)
    .translate(-1.5, (PCB_W - USB_WIDTH) / 2, PCB_T)]);

// ---- EN + BOOT tactile buttons near the USB end --------------------------
function tactSwitch(id: string, x: number, y: number): void {
  parts.push([`${id}-body`, box(4.0, 3.0, 1.8).color(BTN_BODY).translate(x, y, PCB_T)]);
  parts.push([`${id}-cap`,
    box(2.0, 1.8, 0.8).color(BTN_CAP).translate(x + 1.0, y + 0.6, PCB_T + 1.8)]);
}
tactSwitch('en-button', 6.5, 4.0);    // EN — lower edge side
tactSwitch('boot-button', 6.5, 21.0); // BOOT/IO0 — upper edge side

// ---- AMS1117 3.3V regulator (SOT-223) ------------------------------------
parts.push(['ams1117',
  box(6.5, 3.5, 1.6).color(IC_DARK).translate(16.0, 12.5, PCB_T)]);

// ---- Indicator LEDs (red power, blue user) -------------------------------
parts.push(['led-power', box(1.6, 0.9, 0.75).color(LED_RED).translate(12.0, 20.5, PCB_T)]);
parts.push(['led-user',  box(1.6, 0.9, 0.75).color(LED_BLUE).translate(12.0, 6.5, PCB_T)]);

// ---- A few 0805 passives around the regulator ----------------------------
const passivePositions: [number, number][] = [
  [24.0, 10.5], [24.0, 15.5], [27.0, 12.5], [20.5, 18.0], [20.5, 7.0],
];
passivePositions.forEach(([cx, cy], i) => {
  parts.push([`passive-${i}`, box(1.6, 0.9, 0.55).color(PASSIVE_TAN).translate(cx, cy, PCB_T)]);
});

// ---- Assemble ------------------------------------------------------------
const asm = assembly('esp32-devkit-board');
for (const [name, shape] of parts) asm.part(name, shape);
return asm.model();
