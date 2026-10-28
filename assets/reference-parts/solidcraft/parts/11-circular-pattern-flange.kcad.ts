const annulus = cylinder(10, 50).subtract(cylinder(10, 15));
// Pattern the cutter solid, then subtract once. pattern repeats a body, not a void.
const cutter = cylinder(12, 5).translate(40, 0, -1).patternCircular({ count: 6, axis: [0, 0, 1] });
return annulus.subtract(cutter);
