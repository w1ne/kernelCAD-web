const boltDiam = 5;

const t = 2 * boltDiam;       // wall thickness
const w = 4 * boltDiam;       // plate width/length (>= 3 * boltDiam)
const h = 3 * boltDiam;       // plate height (>= 3 * boltDiam)
const holeR = (boltDiam + 0.5) / 2;

// Horizontal plate (foot of the L): x in [0,w], y in [0,h], z in [0,t].
// Hole through Z at plate centroid.
const horiz = box(w, h, t).subtract(
  cylinder(t + 2, holeR).translate(w / 2, h / 2, -1),
);

// Vertical plate (upright of the L): x in [0,t], y in [0,h], z in [t, t+w].
// Sits flush on top of the horizontal plate's near edge — no volume overlap.
// Hole through X at the centroid of the vertical face.
const vert = box(t, h, w).subtract(
  cylinder(t + 2, holeR).rotate([0, 1, 0], 90).translate(-1, h / 2, w / 2),
).translate(0, 0, t);

return horiz.union(vert);