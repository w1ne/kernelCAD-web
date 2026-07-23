// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/authored/sound-sensor.kcad.ts
//
// KY-037 sound sensor (32×17 mm).

const PCB_L = 32;
const PCB_W = 17;
const PCB_T = 1.6;
const HOLE_R = 1.0;
const PCB = '#1a6b3a';
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

const mic=cylinder(3.5,4.5,24).color('#2a2a32').translate(22,8.5,PCB_T);
const mesh=cylinder(0.4,4.0,20).color('#6a6a78').translate(22,8.5,PCB_T+3.5);
const pot=cylinder(2.0,2.0,16).color('#2a2a32').translate(10,8.5,PCB_T);

const asm = assembly('sound-sensor');
asm.part('pcb', pcb);
asm.part('header-body', headerBody);
headerPins.forEach((p, i) => asm.part(`pin-${i}`, p));
asm.part('mic',mic);
asm.part('mesh',mesh);
asm.part('trim',pot);
return asm.model();
