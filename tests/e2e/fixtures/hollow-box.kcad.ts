const w = param('Width', 30, { unit: 'mm', min: 10, max: 100 });
const h = param('Height', 30, { unit: 'mm', min: 10, max: 100 });
const d = param('Depth', 20, { unit: 'mm', min: 5, max: 80 });
const t = param('WallThickness', 1.5, { unit: 'mm', min: 0.5, max: 5 });

return box(w, h, d).shell(t, { face: 'top' });
