// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/max14827.kcad.ts
//
// MAX14827 IO-Link PHY breakout module.
// Overall footprint: 12 x 10 x 2 mm.
// Layout: small green PCB (12×10×1.6mm); MAX14827 QFN IC (~4×4×0.8mm) centered;
// 2-pin C/Q connector block on one long edge; a few bypass caps; crystal/oscillator.

const PCB_L = 12.0;
const PCB_W = 10.0;
const PCB_T = 1.6;

const PCB_GREEN = '#1a3020';
const IC_DARK   = '#1e1e26';
const GOLD      = '#c8a040';
const PASSIVE   = '#7a6040';
const XTAL_GRAY = '#808090';

// PCB slab
const pcb = box(PCB_L, PCB_W, PCB_T).color(PCB_GREEN);

// MAX14827 QFN-24 package (4×4×0.8mm) — IO-Link PHY, center-ish
const ic = box(4.0, 4.0, 0.8).color(IC_DARK).translate((PCB_L - 4) / 2, (PCB_W - 4) / 2, PCB_T);

// 2-pin IO-Link C/Q terminal connector on +Y edge
const connW = 5.0;
const connH = 3.5;
const connDepth = 4.0;
const connX = (PCB_L - connW) / 2;
const connBody = box(connW, connDepth, connH).color('#2a2a36').translate(connX, PCB_W - 1.0, PCB_T);
// two terminal holes (visual only, as slightly recessed boxes)
const term1 = box(1.5, 1.5, connH - 0.6).color('#101018').translate(connX + 0.5, PCB_W + 1.0, PCB_T + 0.3);
const term2 = box(1.5, 1.5, connH - 0.6).color('#101018').translate(connX + 3.0, PCB_W + 1.0, PCB_T + 0.3);

// 4-pin debug/power header on -Y edge
const dbgPinCount = 4;
const dbgPinPitch = 2.54;
const dbgHeaderW = (dbgPinCount - 1) * dbgPinPitch + 2.5;
const dbgHeaderX = (PCB_L - dbgHeaderW) / 2;
const dbgHeader = box(dbgHeaderW, 2.5, 2.5).color('#1a1a28').translate(dbgHeaderX, -2.5, PCB_T);
const dbgPins: Shape[] = [];
for (let i = 0; i < dbgPinCount; i++) {
  const px = dbgHeaderX + 1.25 + i * dbgPinPitch;
  dbgPins.push(box(0.6, 6.0, 0.6).color(GOLD).translate(px, -6.0, PCB_T + 0.9));
}

// 16MHz crystal (2016 package, 2×1.6×0.8mm)
const xtal = box(2.0, 1.6, 0.8).color(XTAL_GRAY).translate(1.5, 1.5, PCB_T);

// 0402 bypass capacitors
const caps: Shape[] = [];
for (const [cx, cy] of [[1.5, 4.0], [1.5, 6.0], [9.0, 4.0]] as [number, number][]) {
  caps.push(box(1.0, 0.5, 0.5).color(PASSIVE).translate(cx, cy, PCB_T));
}

const asm = assembly('max14827');
asm.part('pcb', pcb);
asm.part('max14827-ic', ic);
asm.part('connector-body', connBody);
asm.part('terminal-1', term1);
asm.part('terminal-2', term2);
asm.part('debug-header', dbgHeader);
dbgPins.forEach((p, i) => asm.part(`dbg-pin-${i}`, p));
asm.part('xtal', xtal);
caps.forEach((c, i) => asm.part(`cap-${i}`, c));

return asm.model();
