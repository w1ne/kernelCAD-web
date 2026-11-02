meta({
  "name": "diagnostic-monitor",
  "license": "CC0-1.0",
  "title": "Diagnostic monitor",
  "description": "Freestanding patient monitor with display, control panel, upright support and broad base for clinic and ward scenes.",
  "tags": [
    "diagnostic monitor",
    "patient monitor",
    "hospital equipment",
    "clinic",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "prop",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 400
});

const shell = param('shell', '#4d5a62', { label: 'Shell' });
const accent = param('accent', '#39a3a5', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('diagnostic-monitor');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', b(0, 0, 14, 160, 120, 28).color(shell));
p.part('stem', c(0, 0, 28, 220, 11, 10).color(accent));
p.part('bezel', b(0, 0, 204, 210, 44, 150).color(shell));
p.part('screen', b(0, -24, 213, 178, 4, 114).color(accent));
p.part('control-strip', b(0, -25, 133, 150, 4, 18).color(shell));
for (const x of [-52, 0, 52]) p.part('button-' + x, c(x, -27, 133, 5, 7, 8).color(accent));

return p.model();
