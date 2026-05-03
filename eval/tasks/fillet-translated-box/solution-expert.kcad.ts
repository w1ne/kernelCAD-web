const w = param("Width", 40, { unit: 'mm', min: 10, max: 100 });
const h = param("Height", 30, { unit: 'mm', min: 10, max: 100 });
const t = param("Thickness", 10, { unit: 'mm', min: 2, max: 30 });
const ox = param("Offset X", 5, { unit: 'mm' });
const oy = param("Offset Y", 7, { unit: 'mm' });
const r = param("Fillet Radius", 2, { unit: 'mm', min: 0.5, max: 5 });

return box(w, h, t).translate(ox, oy, 0).fillet(r, { face: 'top' });
