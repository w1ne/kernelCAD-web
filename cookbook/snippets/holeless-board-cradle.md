---
id: holeless-board-cradle
title: Parametric cradle and retention rail for a hole-less PCB
tags: [parameter, choice-param, plate, cutout, manufacturing]
keywords:
  - cradle for ESP32 DevKitC board with no mounting holes
  - retain a PCB with edge rails and snap fit clips
  - board carrier with underside pin clearance and USB connector opening
  - cradle rail for holeless development board
  - place a board cradle on an enclosure floor
when_to_use: >-
  A rectangular development board has no mounting holes and needs removable
  edge retention. Creates a perimeter floor frame with an open pin field, two longitudinal
  edge rails with inward lips and supported overhanging catches, clearance below
  the board for header pins, and a through-opening at one selected connector face.
  Set `connectorOffsetMm` to slide the opening along that edge (`0` keeps it
  centered); the board layout rotates with the selected face. All
  dimensions are millimetres; the cradle bottom is at Z=0 so it can sit on an
  enclosure floor. Confirm connector and component keep-outs against the real
  board before manufacture.
example: examples/cookbook/holeless-board-cradle.kcad.ts
---

```typescript
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Parametric cradle for a hole-less ESP32 DevKitC-sized board. The floor datum
// (Z=0) is intended to sit on an enclosure floor; validate real board keep-outs.
const boardLength = param('boardLength', 54.4, { min: 15, max: 200, description: 'PCB long dimension (mm)' });
const boardWidth = param('boardWidth', 27.9, { min: 10, max: 120, description: 'PCB short dimension (mm)' });
const boardThickness = param('boardThickness', 1.6, { min: 0.8, max: 4, description: 'PCB thickness (mm)' });
const componentHeight = param('componentHeight', 10, { min: 1, max: 40, description: 'Tallest component above PCB (mm)' });
const clearance = param('clearance', 0.35, { min: 0.1, max: 1.5, description: 'Side fit clearance (mm)' });
const pinClearance = param('pinClearance', 3, { min: 1, max: 12, description: 'Open gap beneath PCB for pins (mm)' });
const clipCount = param('clipCount', '4', { choices: ['2', '3', '4', '5', '6', '7', '8'], description: 'Number of retention clips' });
const connectorFace = param('connectorFace', '-X', { choices: ['-X', '+X', '-Y', '+Y'], description: 'Board connector edge and opening orientation' });
const connectorOffsetMm = param('connectorOffsetMm', 0, { min: -96, max: 96, description: 'Connector opening offset along selected edge from center (mm)' });

const railT = 2.2;
const floorT = 2;
const lip = 1.2;
const clipWidth = 5;
const railEndInset = 5;
const insideL = boardLength.add(clearance.multiply(2));
const insideW = boardWidth.add(clearance.multiply(2));
const outerL = insideL.add(4.4);
const outerW = insideW.add(4.4);
const boardY = clearance.add(railT);
const boardZ = pinClearance.add(floorT);
const railHeight = boardThickness.add(componentHeight).add(1.5);

// The cavity is centered between the rail inner faces. The board proxy starts
// one side-clearance inboard of each inner face and remains clear of the rails.
// A perimeter frame leaves a pin field open below the board instead of placing
// header pins over a solid floor plate.
let cradle = box(outerL, outerW, floorT)
  .subtract(box(insideL, insideW, floorT).translate(railT, railT, 0));
const railLength = outerL.subtract(railEndInset * 2);
cradle = cradle.union(box(railLength, railT, railHeight).translate(railEndInset, 0, floorT));
cradle = cradle.union(box(railLength, railT, railHeight).translate(railEndInset, outerW.subtract(railT), floorT));

// End walls and the connector opening are built after the rails and catches.

// Discrete overhanging catches sit on the board top and overlap both PCB edges.
const clipCountValue = Number(clipCount.value);
const clipMargin = 5;
const clipSpan = boardLength.subtract(clipMargin * 2 + clipWidth);
const clipPitch = clipSpan.divide(clipCountValue - 1);
const catchZ = boardZ.add(boardThickness);
for (let i = 0; i < clipCountValue; i++) {
  const x = clipPitch.multiply(i).add(boardY).add(clipMargin);
  const lowerCatchY = boardY.subtract(clearance);
  const upperCatchY = boardY.add(boardWidth).add(clearance).subtract(lip);
  const supportDepth = clearance.add(1);
  // Uprights sit outside the PCB outline, tie each catch into its rail, and
  // leave the board envelope clear while backing the snap overhang.
  const lowerPost = box(clipWidth, supportDepth, catchZ.subtract(floorT)).translate(x, railT - 1, floorT);
  const upperPost = box(clipWidth, supportDepth, catchZ.subtract(floorT)).translate(x, boardY.add(boardWidth), floorT);
  const lowerCatch = box(clipWidth, lip, 1.2).translate(x, lowerCatchY, catchZ);
  const upperCatch = box(clipWidth, lip, 1.2).translate(x, upperCatchY, catchZ);
  cradle = cradle.union(lowerPost);
  cradle = cradle.union(upperPost);
  cradle = cradle.union(lowerCatch);
  cradle = cradle.union(upperCatch);
}

// The opening is sized for the board-edge connector in the canonical -X frame.
const portW = 8;
const portH = 8;
const portZ = boardZ.add(boardThickness).subtract(1);
const port = box(railT + 2, portW, portH).translate(-1, outerW.subtract(portW).divide(2).add(connectorOffsetMm), portZ);
if (connectorFace.value === '-X') {
  cradle = cradle.union(box(railT, outerW, railHeight).translate(0, 0, floorT));
  cradle = cradle.union(box(railT, outerW, railHeight).translate(outerL.subtract(railT), 0, floorT));
  cradle = cradle.subtract(port);
} else if (connectorFace.value === '+X') {
  cradle = cradle.union(box(railT, outerW, railHeight).translate(0, 0, floorT));
  cradle = cradle.union(box(railT, outerW, railHeight).translate(outerL.subtract(railT), 0, floorT));
  const oppositePort = box(railT + 2, portW, portH)
    .translate(outerL.subtract(railT + 1), outerW.subtract(portW).divide(2).add(connectorOffsetMm), portZ);
  cradle = cradle.subtract(oppositePort);
} else if (connectorFace.value === '-Y') {
  cradle = cradle.union(box(railT, outerW, railHeight).translate(0, 0, floorT));
  cradle = cradle.union(box(railT, outerW, railHeight).translate(outerL.subtract(railT), 0, floorT));
  cradle = cradle.subtract(port);
  cradle = cradle.rotate([0, 0, 1], 90).translate(outerW, 0, 0);
} else {
  cradle = cradle.union(box(railT, outerW, railHeight).translate(0, 0, floorT));
  cradle = cradle.union(box(railT, outerW, railHeight).translate(outerL.subtract(railT), 0, floorT));
  cradle = cradle.subtract(port);
  cradle = cradle.rotate([0, 0, 1], -90).translate(0, outerL, 0);
}

return cradle;
```
