// Straight span plus a separate cylinder cap at each end (centres 40 mm apart, radius 6).
const shank = box(40, 12, 5).translate(0, -6, 0);
const left = cylinder(5, 6);
const right = cylinder(5, 6).translate(40, 0, 0);
return shank.union(left).union(right);
