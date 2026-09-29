// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-drill-jig/solution-expert.kcad.ts
//
// Typical use case U12: drill guide jig for a hole into the edge of an 18 mm
// board, 20 mm from the board's end, centred on its thickness.
//
// Board frame: the board's edge face is z = 0 (board below), its faces are
// x = 0 and x = 18, its end is y = 0 (board toward +Y). The guide block sits
// on the edge; two cheeks hug both faces so the bushing is centred on the
// thickness; the end fence registers on the board's end.

const boardThickness = param('boardThickness', 18);
const holeFromEnd = param('holeFromEnd', 20);
const bushingDia = param('bushingDia', 8);
const cheek = param('cheek', 6); // cheek and fence thickness
const blockH = param('blockH', 15); // guide length for the drill
const reach = param('reach', 20); // how far the cheeks run down the faces
const length = param('length', 36); // along the edge, from the board's end

const outerW = boardThickness.add(cheek.multiply(2));

// Guide block on the edge, over the cheeks and the end fence.
const block = box(outerW, length.add(cheek), blockH).translate(cheek.negate(), cheek.negate(), 0);
// Cheeks down both faces of the board.
const cheekL = box(cheek, length.add(cheek), reach).translate(cheek.negate(), cheek.negate(), reach.negate());
const cheekR = box(cheek, length.add(cheek), reach).translate(boardThickness, cheek.negate(), reach.negate());
// End fence across the board's end.
const fence = box(outerW, cheek, reach).translate(cheek.negate(), cheek.negate(), reach.negate());

let jig = union(block, cheekL, cheekR, fence);
jig = jig.hole('top', {
  u: 0, // the block's top face is centred on the board thickness
  v: holeFromEnd.subtract(length.subtract(cheek).divide(2)),
  diameter: bushingDia,
  depth: 'through',
});

dfmSpec({ minWall: 1.2 });

return jig;
