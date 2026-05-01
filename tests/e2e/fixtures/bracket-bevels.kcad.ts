const length = param('Length', 40, { unit: 'mm', min: 20, max: 100 });
const width = param('Width', 30, { unit: 'mm', min: 15, max: 80 });
const thickness = param('Thickness', 8, { unit: 'mm', min: 3, max: 20 });
const topDistance = param('TopDistance', 1.5, { unit: 'mm', min: 0.5, max: 4 });
const bottomDistance = param('BottomDistance', 0.4, { unit: 'mm', min: 0.2, max: 1.5 });

// Mounting plate with mixed-distance bevels:
//   Top edges (z = thickness): generous chamfer (visual + ergonomic).
//   Bottom edges (z = 0): light bevel (deburring only).
return box(length, width, thickness)
  .chamfer([
    { edges: { atZ: thickness }, distance: topDistance },
    { edges: { atZ: 0 }, distance: bottomDistance },
  ]);
