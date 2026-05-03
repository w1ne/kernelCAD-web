const w = param("Width", 40, { unit: 'mm', min: 10, max: 100 });
const d = param("Depth", 30, { unit: 'mm', min: 10, max: 100 });
const h = param("Height", 20, { unit: 'mm', min: 5, max: 60 });
const tilt = param("Tilt", 30, { unit: 'deg', min: 5, max: 60 });
const cd = param("Chamfer Distance", 1.5, { unit: 'mm', min: 0.2, max: 5 });

return box(w, d, h).rotate([1, 0, 0], tilt).chamfer(cd, { face: 'top' });
