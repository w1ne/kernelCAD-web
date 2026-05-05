const length = 40;
const width = 30;
const thickness = 8;
const topDistance = 1.5;
const bottomDistance = 0.4;

// Mounting plate with mixed-distance bevels:
//   Top edges (z = thickness): generous chamfer (visual + ergonomic).
//   Bottom edges (z = 0): light bevel (deburring only).
return box(length, width, thickness)
  .chamfer([
    { edges: { atZ: thickness }, distance: topDistance },
    { edges: { atZ: 0 }, distance: bottomDistance },
  ]);
