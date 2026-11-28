// Run from this directory with the repository's sealed-float fixture.
const float = await lib.fromSTL('./sealed-float.stl');
// A 6 mm fill port on the axis: 3 mm of floor, the 34 mm void, 3 mm of lid.
const ported = float.subtract(cylinder(50, 3).translate(0, 0, -5));
// Cutaways through the axis, to show the void.
const front = box(40, 20, 50).translate(-20, -20, -5);
return { float, ported, floatSection: float.subtract(front), portedSection: ported.subtract(front) };
