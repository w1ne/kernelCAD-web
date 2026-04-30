const w = param('Width', 60, { unit: 'mm', min: 30, max: 200 });
const h = param('Height', 40, { unit: 'mm', min: 20, max: 120 });
const r = param('CornerRadius', 4, { unit: 'mm', min: 1, max: 10 });
const t = param('Thickness', 5, { unit: 'mm', min: 2, max: 15 });

return extrudeRoundedRect(w, h, r, t);
