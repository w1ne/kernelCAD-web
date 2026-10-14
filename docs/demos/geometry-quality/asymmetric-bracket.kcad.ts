// SPDX-License-Identifier: MIT
// Same synthetic bracket with one off-axis notch; x=0 symmetry must fail.
const base = box(40, 20, 4, true);
const upright = box(40, 4, 20, true).translate(0, 8, 8);
const notch = box(4, 6, 6, true).translate(12, -7, 0);
return base.union(upright).subtract(notch);
