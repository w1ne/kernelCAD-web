---
id: gridfinity-bin
title: Gridfinity bin with base profile, magnets, dividers and stacking lip
tags: [parameter, stacking, hole, manufacturing, extrude, chamfer]
keywords:
  - gridfinity bin storage box organizer 42 mm grid
  - parametric grid units X by Y and 7 mm height units
  - base profile 0.8 chamfer 1.8 straight 2.15 chamfer 4.75 mm
  - magnet holes 6 x 2 mm under each foot
  - dividers compartments and stacking lip
when_to_use: >-
  You need a Gridfinity-compatible storage bin: X × Y grid units on the 42 mm
  pitch (0.5 mm clearance), height in 7 mm units, one profiled foot per cell
  (0.8 / 1.8 / 2.15 mm = 4.75 mm), optional Ø6 × 2 mm magnet holes at ±13 mm,
  optional dividers, and a stacking lip (0.7 / 1.8 / 1.9 mm). The script
  throws a clear error when magnets do not fit the foot or the floor, or when
  the bin is too shallow for a cavity under the lip.
---

```typescript
// Gridfinity bin — parametric X × Y grid units × height units.
//
// Dimensions from the Gridfinity specification (https://gridfinity.xyz/specification/,
// magnets 6 × 2 mm) and its reference constants
// (https://github.com/kennetek/gridfinity-rebuilt-openscad/blob/main/src/core/standard.scad):
//   42 mm grid pitch, bin = 42·n − 0.5 mm (0.5 mm clearance), top corner radius 3.75 mm,
//   base profile from the bottom: 0.8 chamfer / 1.8 straight / 2.15 chamfer = 4.75 mm,
//   7 mm height units, magnet holes Ø6.5 × 2.4 mm at ±13 mm from the cell centre,
//   stacking lip 0.7 chamfer / 1.8 straight / 1.9 chamfer = 4.4 mm, wall 0.95 mm.
const unitsX = 2;          // grid units along X
const unitsY = 1;          // grid units along Y
const heightUnits = 3;     // 7 mm each; bin top (below the lip) at z = 7 · heightUnits
const magnets = true;      // magnet holes under every foot corner
const magnetD = 6;         // magnet Ø (mm); hole = Ø + 0.5
const magnetT = 2;         // magnet thickness (mm); hole = t + 0.4
const dividersX = 1;       // internal walls across X (0 = none)
const dividersY = 0;       // internal walls across Y
const stackingLip = true;

const PITCH = 42, CLEARANCE = 0.5, R_TOP = 3.75;
const C1 = 0.8, S1 = 1.8, C2 = 2.15, BASE_H = C1 + S1 + C2; // 4.75
const LIP_C1 = 0.7, LIP_S = 1.8, LIP_C2 = 1.9, LIP_H = LIP_C1 + LIP_S + LIP_C2; // 4.4
const WALL = 0.95, FLOOR = 1.2, DIVIDER = 1.2, SKIN = 0.6; // SKIN: min plastic over a magnet
const W = PITCH * unitsX - CLEARANCE;
const D = PITCH * unitsY - CLEARANCE;
const TOP = 7 * heightUnits;
const holeD = magnetD + 0.5, holeH = magnetT + 0.4;

// Rounded-rect prism centred in X/Y, spanning z = 0..h.
const slab = (w, d, r, h) => extrudeRoundedRect(w, d, r, h);
// Two-step 45° profile: bottom chamfer c1, straight s, outward chamfer c2 up to
// the full (w × d, radius r) outline, which then runs on for `ext` mm. Used for
// the feet (ext overlaps the bin body) and the lip cutter (ext clears the top).
// Faces are picked by height ({ atZ }) — extruded profiles have no 'top'/'bottom'.
function profiled(w, d, r, c1, s, c2, ext) {
  const lower = slab(w - 2 * c2, d - 2 * c2, r - c2, c1 + s).chamfer(c1, { face: { atZ: 0 } });
  const upper = slab(w, d, r, c2 + ext).chamfer(c2, { face: { atZ: 0 } }).translate(0, 0, c1 + s);
  return lower.union(upper);
}

// Checks: fail loudly instead of printing a magnet that pokes through.
const footHalf = (PITCH - CLEARANCE) / 2 - C2 - C1;   // half-width of a foot's bottom face
if (magnets && 13 + holeD / 2 > footHalf - 0.4) {
  throw new Error(`gridfinity: a Ø${magnetD} magnet does not fit the foot (hole reaches ${13 + holeD / 2} mm, foot edge at ${footHalf} mm). Use Ø6 × 2 magnets.`);
}
const floorZ = BASE_H + FLOOR;                         // top of the bin floor
if (magnets && holeH + SKIN > floorZ) {
  throw new Error(`gridfinity: ${magnetT} mm magnets leave < ${SKIN} mm under the floor. Use thinner magnets or magnets = false.`);
}
const ledge = LIP_C1 + LIP_C2 - WALL;                 // lip overhang, chamfered 45° below
if (TOP - floorZ < (stackingLip ? ledge + 0.2 : 0.2)) {
  throw new Error(`gridfinity: heightUnits = ${heightUnits} is too shallow for a cavity${stackingLip ? ' under the stacking lip' : ''} (floor at ${floorZ} mm, top at ${TOP} mm). Use heightUnits >= 2${stackingLip ? ' or stackingLip = false' : ''}.`);
}

// Feet: one profiled foot per grid cell.
let bin = slab(W, D, R_TOP, TOP - BASE_H).translate(0, 0, BASE_H);
for (let i = 0; i < unitsX; i++) {
  for (let j = 0; j < unitsY; j++) {
    const cx = (i - (unitsX - 1) / 2) * PITCH;
    const cy = (j - (unitsY - 1) / 2) * PITCH;
    bin = bin.union(profiled(PITCH - CLEARANCE, PITCH - CLEARANCE, R_TOP, C1, S1, C2, 1).translate(cx, cy, 0));
  }
}

// Cavity from the floor to the top; with a lip, its top edge is chamfered 45°
// so the lip ledge prints without support.
let cavity = slab(W - 2 * WALL, D - 2 * WALL, R_TOP - WALL, TOP - floorZ).translate(0, 0, floorZ);
if (stackingLip) {
  cavity = slab(W - 2 * WALL, D - 2 * WALL, R_TOP - WALL, TOP - floorZ)
    .chamfer(ledge, { face: { atZ: TOP - floorZ } })
    .translate(0, 0, floorZ);
}
bin = bin.subtract(cavity);

// Dividers: full-height walls from the floor to the top of the bin.
for (let k = 1; k <= dividersX; k++) {
  const x = -W / 2 + (k * W) / (dividersX + 1);
  bin = bin.union(box(DIVIDER, D - 2 * WALL, TOP - floorZ, true).translate(x, 0, floorZ + (TOP - floorZ) / 2));
}
for (let k = 1; k <= dividersY; k++) {
  const y = -D / 2 + (k * D) / (dividersY + 1);
  bin = bin.union(box(W - 2 * WALL, DIVIDER, TOP - floorZ, true).translate(0, y, floorZ + (TOP - floorZ) / 2));
}

// Stacking lip: a W × D ring on top, cut by the inverse of the base profile.
if (stackingLip) {
  const lipCutter = profiled(W, D, R_TOP, LIP_C1, LIP_S, LIP_C2, 1).translate(0, 0, TOP);
  const lip = slab(W, D, R_TOP, LIP_H).translate(0, 0, TOP).subtract(lipCutter);
  bin = bin.union(lip);
}

// Magnet holes: 4 per foot at ±13 mm, from the bottom face up.
if (magnets) {
  for (let i = 0; i < unitsX; i++) {
    for (let j = 0; j < unitsY; j++) {
      const cx = (i - (unitsX - 1) / 2) * PITCH;
      const cy = (j - (unitsY - 1) / 2) * PITCH;
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        bin = bin.subtract(cylinder(holeH, holeD / 2).translate(cx + 13 * sx, cy + 13 * sy, 0));
      }
    }
  }
}

return bin;
```
