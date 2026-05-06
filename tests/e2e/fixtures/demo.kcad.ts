const w = 100;
const h = 50;
const d = 30;

const base = box(w, h, d);
const hole = cylinder(d + 10, 10).translate(w / 2, h / 2, -5);
const plate = base.subtract(hole);

return plate;
