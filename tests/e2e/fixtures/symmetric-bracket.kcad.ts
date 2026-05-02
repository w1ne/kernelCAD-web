const halfWidth = param('HalfWidth', 20, { unit: 'mm', min: 10, max: 50 });
const depth = param('Depth', 30, { unit: 'mm', min: 15, max: 80 });
const thickness = param('Thickness', 5, { unit: 'mm', min: 2, max: 12 });
const boltSpacing = param('BoltSpacing', 12, { unit: 'mm', min: 8, max: 20 });
const boltDiameter = param('BoltDiameter', 4, { unit: 'mm', min: 2, max: 8 });

// Build the right half: an L-bracket with a bolt hole on the depth-axis arm.
const rightHalf = box(halfWidth, depth, thickness)
  .subtract(
    cylinder(boltDiameter / 2, thickness)
      .translate(halfWidth - 5, depth - boltSpacing, 0),
  );

// Mirror across yz to produce a symmetric U-bracket with two bolt holes.
return rightHalf.mirror({ plane: 'yz' });
