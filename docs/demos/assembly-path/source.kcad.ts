// SPDX-License-Identifier: MIT
// Synthetic clearance fixture, not a production hardware model.
// Modes: blind (open +Z), captured (housing includes cap), order (separate lid).
const mode = 'blind';
const peg = box(2, 2, 3);
let housing = box(6, 6, 5).translate(-2, -2, -1)
  .subtract(box(2.2, 2.2, 6).translate(-0.1, -0.1, -0.1));
const lid = box(6, 6, 0.5).translate(-2, -2, 4.1);
if (mode === 'captured') housing = housing.union(lid.translate(0, 0, -0.2));
const a = assembly('assembly-path-demo');
a.part('peg', peg);
if (mode === 'order') a.part('lid', lid);
a.part('housing', housing);
return a.model();
