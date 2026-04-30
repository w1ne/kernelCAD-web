const w = param('Width', 30, { unit: 'mm', min: 10, max: 80 });
const t = param('Thickness', 5, { unit: 'mm', min: 1, max: 20 });

// Equilateral triangle, base = w
const h = w * Math.sqrt(3) / 2;
return extrudePolygon([[0, 0], [w, 0], [w/2, h]], t);
