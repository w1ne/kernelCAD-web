const w = 40;
const d = 30;
const h = 20;
const tilt = 30;
const cd = 1.5;

return box(w, d, h).rotate([1, 0, 0], tilt).chamfer(cd, { face: 'top' });
