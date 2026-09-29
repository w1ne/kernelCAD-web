// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-plywood-shelf/solution-expert.kcad.ts
//
// Typical use case U9: bookshelf from 18 mm plywood, 800 wide, 1200 tall,
// 300 deep, 4 shelves, dado joints, for a CNC. Every board is its own part so
// the cut list (BOM) and the per-part DXFs come straight from the assembly.
//
// Two side panels carry 9 mm deep, 18 mm wide dados on their inner faces;
// the bottom, the four shelves and the top run into the dados. The shelves
// split the height into five equal compartments.

const W = 800;
const H = 1200;
const D = 300;
const T = 18; // plywood thickness
const dado = 9; // dado depth
const shelfCount = 4;
const PLY = '#c8a26b'; // plywood colour

const boardLen = W - 2 * T + 2 * dado; // 782: reaches the bottom of both dados
const compartment = (H - 2 * T - shelfCount * T) / (shelfCount + 1); // 218.4

// Board centre heights: bottom, four shelves, top.
const boardZs = [T / 2];
for (let i = 1; i <= shelfCount; i++) boardZs.push(T + i * compartment + (i - 1) * T + T / 2);
boardZs.push(H - T / 2);

/** A side panel with a dado for every board, cut into the face at x = inner. */
function side(x0: number, inner: number) {
  let panel = box(T, D, H).translate(x0, 0, 0);
  for (const z of boardZs) {
    panel = panel.subtract(box(dado, D + 2, T).translate(inner, -1, z - T / 2));
  }
  return panel;
}

const shelf = assembly('plywood-bookshelf');
shelf.part('side-left', side(0, T - dado).color(PLY));
shelf.part('side-right', side(W - T, W - T).color(PLY));
const names = ['bottom', 'shelf-1', 'shelf-2', 'shelf-3', 'shelf-4', 'top'];
boardZs.forEach((z, i) => {
  shelf.part(names[i], box(boardLen, D, T).translate(T - dado, 0, z - T / 2).color(PLY));
});

return shelf.model();
