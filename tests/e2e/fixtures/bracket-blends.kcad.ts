const length = param('Length', 40, { unit: 'mm', min: 20, max: 100 });
const width = param('Width', 30, { unit: 'mm', min: 15, max: 80 });
const thickness = param('Thickness', 8, { unit: 'mm', min: 3, max: 20 });
const topRadius = param('TopRadius', 2.0, { unit: 'mm', min: 0.5, max: 5 });
const bottomRadius = param('BottomRadius', 0.5, { unit: 'mm', min: 0.2, max: 2 });

// Mounting plate with mixed-radius blends:
//   Top edges (z = thickness): generous fillet (ergonomic / fluid flow).
//   Bottom edges (z = 0): light fillet (deburring only — bottom mates flush).
return box(length, width, thickness)
  .fillet([
    { edges: { atZ: thickness }, radius: topRadius },
    { edges: { atZ: 0 }, radius: bottomRadius },
  ]);
