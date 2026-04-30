const w = param('Width', 60, { unit: 'mm', min: 30, max: 200 });
const h = param('Height', 40, { unit: 'mm', min: 20, max: 120 });
const t = param('Thickness', 5, { unit: 'mm', min: 2, max: 15 });
const r = param('FilletRadius', 2, { unit: 'mm', min: 0.5, max: 4 });

const base = box(w, h, t);
const hole = cylinder(t + 2, 4).translate(w/2, h/2, -1);
return base.subtract(hole).fillet(r);
