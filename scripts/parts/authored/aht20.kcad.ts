// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/aht20.kcad.ts
//
// AHT20 temp/humidity breakout (15×15 mm).

const PCB_L = 15;
const PCB_W = 15;
const PCB_T = 1.6;
const HOLE_R = 1.0;
const PCB = '#1a3a4a';
const IC = '#1a1a22';
const CU = '#c8a040';
const HDR = '#1a1a28';
const PASS = '#8a6a40';

const holes = [
  [2.0, 2.0], [PCB_L - 2.0, 2.0], [2.0, PCB_W - 2.0], [PCB_L - 2.0, PCB_W - 2.0],
].map(([x, y]) => cylinder(PCB_T + 2, HOLE_R, 20).translate(x, y, -1));
const pcb = box(PCB_L, PCB_W, PCB_T).subtract(...holes).color(PCB);

const n = 4;
const pitch = 2.54;
const hdrH = (n - 1) * pitch + 2.4;
const hdrY = (PCB_W - hdrH) / 2;
const headerBody = box(2.4, hdrH, 2.5).color(HDR).translate(-2.4, hdrY, PCB_T);
const headerPins: Shape[] = [];
for (let i = 0; i < n; i++) {
  const py = hdrY + 1.2 + i * pitch;
  headerPins.push(box(7.0, 0.64, 0.64).color(CU).translate(-7.0, py, PCB_T + 0.95));
}

const ic = box(3.0, 3.0, 0.9).color(IC).translate(6.0, 6.0, PCB_T);
const caps: Shape[] = [box(1.0,0.5,0.45).color(PASS).translate(3.0,4.0,PCB_T), box(1.0,0.5,0.45).color(PASS).translate(11.0,4.0,PCB_T)];

const asm = assembly('aht20');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
headerPins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('aht20-ic', ic);
caps.forEach((c,i)=>asm.part(`cap-${i}`,c));
return asm.model();
