const w = 60;
const h = 40;
const t = 5;
const r = 2;

const base = box(w, h, t);
const hole = cylinder(t + 2, 4).translate(w/2, h/2, -1);
return base.subtract(hole).fillet(r);
