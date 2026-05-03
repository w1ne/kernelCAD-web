const s = param("Plate Size", 50, { unit: 'mm', min: 20, max: 200 });
const t = param("Plate Thickness", 8, { unit: 'mm', min: 2, max: 30 });
const d = param("Hole Diameter", 12, { unit: 'mm', min: 3, max: 30 });
const r = param("Fillet Radius", 1.5, { unit: 'mm', min: 0.2, max: 5 });

const plate = box(s, s, t);
const hole = cylinder(t + 2, d / 2).translate(s / 2, s / 2, -1);

return plate.subtract(hole).fillet(r, { face: 'top' });
