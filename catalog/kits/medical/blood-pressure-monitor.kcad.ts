meta({
  "name": "blood-pressure-monitor",
  "license": "CC0-1.0",
  "title": "Blood pressure monitor",
  "description": "Portable blood pressure monitor with digital readout, control buttons, attached cuff and connecting tube for clinic scenes.",
  "tags": [
    "blood pressure monitor",
    "sphygmomanometer",
    "cuff",
    "healthcare",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "item",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 400
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#e9eef0', { label: 'Shell' });
const accent = param('accent', '#397c86', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('blood-pressure-monitor');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('monitor', b(0, -38, 50, 138, 44, 92).color(shell).scale(overallScale));
p.part('foot-left', c(-50, -38, 0, 10, 12, 8).color(accent).scale(overallScale));
p.part('foot-right', c(50, -38, 0, 10, 12, 8).color(accent).scale(overallScale));
p.part('screen', b(0, -62, 69, 96, 4, 38).color(accent).scale(overallScale));
for (const x of [-34, 0, 34]) p.part('button-' + x, c(x, -64, 30, 6, 7, 8).color(shell).scale(overallScale));
p.part('cuff', b(0, 106, 45, 118, 80, 72).color(accent).scale(overallScale));
p.part('tube', box(128, 8, 8, true).rotate([0, 0, 1], 24).translate(62, 35, 43).color(shell).scale(overallScale));

return p.model();
