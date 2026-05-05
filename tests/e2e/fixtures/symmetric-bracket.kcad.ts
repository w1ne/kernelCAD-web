const halfWidth = 20;
const depth = 30;
const thickness = 5;
const boltSpacing = 12;
const boltDiameter = 4;

// Build the right half: an L-bracket with a bolt hole on the depth-axis arm.
const rightHalf = box(halfWidth, depth, thickness)
  .subtract(
    cylinder(thickness, boltDiameter / 2)
      .translate(halfWidth - 5, depth - boltSpacing, 0),
  );

// Mirror across yz to produce a symmetric U-bracket with two bolt holes.
return rightHalf.mirror({ plane: 'yz' });
