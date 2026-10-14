// SPDX-License-Identifier: MIT
// Synthetic L bracket, mirror symmetric across the YZ plane through x=0.
const base = box(40, 20, 4, true);
const upright = box(40, 4, 20, true).translate(0, 8, 8);
return base.union(upright);
