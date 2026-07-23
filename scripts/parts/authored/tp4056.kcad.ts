// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/tp4056.kcad.ts
//
// TP4056 Li-ion charger module with micro-USB and DW01 protection.
// 25 × 17 mm; micro-USB-B; B+/B− pads; charge/full LEDs.

const PCB_L = 25.0;
const PCB_W = 17.0;
const PCB_T = 1.0;

const PCB = '#1a1a22';
const IC = '#1a1a22';
const CU = '#c8a040';
const USB = '#c0c4cc';
const USB_DARK = '#334155';
const PASS = '#8a6a40';
const LED_R = '#ef4444';
const LED_B = '#3b82f6';

const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB);

// Micro-USB receptacle on -Y edge
const usbShell = box(7.5, 5.5, 2.5).color(USB).translate((PCB_L - 7.5) / 2, -2.0, PCB_T);
const usbCavity = box(5.8, 3.5, 1.4).color(USB_DARK).translate((PCB_L - 5.8) / 2, -1.2, PCB_T + 0.5);
const usbTongue = box(5.0, 2.5, 0.4).color('#e2e8f0').translate((PCB_L - 5.0) / 2, -0.5, PCB_T + 0.9);

// TP4056 ESOP-8 with thermal pad look
const tp = box(5.0, 6.0, 1.5).color(IC).translate(4.0, 6.0, PCB_T);
const pin1 = cylinder(0.15, 0.22, 12).color('#f0f0f8').translate(4.4, 6.4, PCB_T + 1.5);

// DW01 + dual MOSFET package (protection)
const dw = box(3.0, 3.0, 1.0).color(IC).translate(12.0, 7.0, PCB_T);
const mos = box(3.0, 3.0, 1.0).color(IC).translate(16.0, 7.0, PCB_T);

// Battery pads B+ B−
const bp = box(3.5, 3.5, 0.25).color(CU).translate(19.5, 2.0, PCB_T);
const bn = box(3.5, 3.5, 0.25).color(CU).translate(19.5, 11.5, PCB_T);

// OUT pads (protected)
const op = box(3.0, 3.0, 0.25).color(CU).translate(2.0, 2.0, PCB_T);
const on = box(3.0, 3.0, 0.25).color(CU).translate(2.0, 11.5, PCB_T);

const ledChg = box(1.6, 0.8, 0.5).color(LED_R).translate(10.0, 12.5, PCB_T);
const ledFull = box(1.6, 0.8, 0.5).color(LED_B).translate(13.0, 12.5, PCB_T);

const caps: Shape[] = [
  box(1.6, 0.8, 0.5).color(PASS).translate(10.0, 4.0, PCB_T),
  box(1.6, 0.8, 0.5).color(PASS).translate(13.0, 4.0, PCB_T),
  box(2.0, 1.2, 0.6).color(PASS).translate(16.0, 12.0, PCB_T),
];

const asm = assembly('tp4056');
asm.part('pcb', pcb);
asm.part('usb-shell', usbShell);
asm.part('usb-cavity', usbCavity);
asm.part('usb-tongue', usbTongue);
asm.part('tp4056-ic', tp);
asm.part('pin1-dot', pin1);
asm.part('dw01', dw);
asm.part('fs8205-mos', mos);
asm.part('pad-b-plus', bp);
asm.part('pad-b-minus', bn);
asm.part('pad-out-plus', op);
asm.part('pad-out-minus', on);
asm.part('led-charging', ledChg);
asm.part('led-full', ledFull);
caps.forEach((c, i) => asm.part(`passive-${i}`, c));
return asm.model();
