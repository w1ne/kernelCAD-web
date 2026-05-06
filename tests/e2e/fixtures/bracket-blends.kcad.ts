const length = 40;
const width = 30;
const thickness = 8;
const topRadius = 2.0;
const bottomRadius = 0.5;

// Mounting plate with mixed-radius blends:
//   Top edges (z = thickness): generous fillet (ergonomic / fluid flow).
//   Bottom edges (z = 0): light fillet (deburring only — bottom mates flush).
return box(length, width, thickness)
  .fillet([
    { edges: { atZ: thickness }, radius: topRadius },
    { edges: { atZ: 0 }, radius: bottomRadius },
  ]);
