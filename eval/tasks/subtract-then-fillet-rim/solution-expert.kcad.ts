const s = 50;
const t = 8;
const d = 12;
const r = 1.5;

const plate = box(s, s, t);
const hole = cylinder(t + 2, d / 2).translate(s / 2, s / 2, -1);

return plate.subtract(hole).fillet(r, { face: 'top' });
