const w = param('Width', 100, { unit: 'mm', min: 50, max: 200 });
const h = param('Height', 50, { unit: 'mm', min: 20, max: 100 });
const d = param('Depth', 30, { unit: 'mm', min: 10, max: 80 });

const base = box(w, h, d);
const hole = cylinder(d + 10, 10).translate(w / 2, h / 2, -5);
const plate = base.subtract(hole);

return plate;
