const w = 40;
const h = 30;
const t = 10;
const ox = 5;
const oy = 7;
const r = 2;

return box(w, h, t).translate(ox, oy, 0).fillet(r, { face: 'top' });
