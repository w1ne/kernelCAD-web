// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-keychain/solution-expert.kcad.ts
//
// Typical use case U13: keychain 60 x 25 x 4 mm with rounded corners, the
// text 'ANNA' raised 1 mm and a 5 mm ring hole. The text is its own part so
// it prints in a second colour.

const plateW = 60;
const plateH = 25;
const plateT = 4;
const cornerR = 4;
const ringHoleD = 5;
const textDepth = 1;
// Size 12 is legible, fits the 25 mm height and clears the ring hole.
const textSize = 12;

// Base plate: rounded rect, XY centered at origin, Z 0..plateT.
let base = extrudeRoundedRect(plateW, plateH, cornerR, plateT);

// Ring hole: 5mm through-hole, inset from the left edge, vertically centered.
const ringHoleX = -plateW / 2 + 8; // 8mm inset from the left edge
const ringHole = cylinder(plateT + 2, ringHoleD / 2).translate(ringHoleX, 0, -1);
base = base.subtract(ringHole);

// "ANNA" raised 1 mm on the top face. The text baseline is at y = 0, so
// shift down by half the cap height (8.26 mm at size 12) to centre it.
const textCapHeight = 8.26;
const text = sketch.text('ANNA', { size: textSize, align: 'center', position: [0, 0] })
  .extrude(textDepth)
  .translate(0, -textCapHeight / 2, plateT);

// The text sits on the body by design (a bonded two-colour seam, not a
// clearance defect), and 1 mm raised letters on a 4 mm base print fine, so
// the text is excluded from the min-wall gate.
dfmSpec({ minWall: 1.2, minClearance: 0.3, ignore: [['body', 'text']], exclude: ['text'] });

const kc = assembly('anna-keychain');
kc.part('body', base.color('plate'));
kc.part('text', text.color('#2266ee'));

return kc.model();
