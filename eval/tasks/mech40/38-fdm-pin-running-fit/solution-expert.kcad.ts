// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40/38: 30 × 20 × 12 bracket with a running-fit bore (Ø8 + 2 × 0.3) and an Ø8 × 20 pin.
const pinD = 8;
const fit = 0.3; // per side: FDM running fit
const H = 12;

const bracket = box(30, 20, H).hole('top', { u: 0, v: 0, diameter: pinD + 2 * fit, depth: 'through', name: 'bore' });
const pin = cylinder(20, pinD / 2).translate(15, 10, -4);

// The gate measures the real gap between the parts (exact BREP distance).
dfmSpec({ minClearance: 0.25 });

const asm = assembly('pin-fit');
asm.part('bracket', bracket, { material: 'pla' });
asm.part('pin', pin, { material: 'pla' });
return asm.model();
