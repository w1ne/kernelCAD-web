const w = 30;
const t = 5;

// Equilateral triangle, base = w
const h = w * Math.sqrt(3) / 2;
return extrudePolygon([[0, 0], [w, 0], [w/2, h]], t);
