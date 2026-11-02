meta({
  "name": "sharps-container",
  "license": "CC0-1.0",
  "title": "Sharps container",
  "description": "Rigid sharps disposal container with broad base, stepped lid and narrow drop slot for a clinic or laboratory scene.",
  "tags": [
    "sharps container",
    "medical waste",
    "needle disposal",
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
  "triangleBudget": 300
});

const shell = param('shell', '#f1b944', { label: 'Shell' });
const accent = param('accent', '#c9433d', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('sharps-container');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('base', b(0, 0, 65, 126, 126, 130).color(shell));
p.part('shoulder', b(0, 0, 140, 110, 110, 24).color(accent));
p.part('lid', b(0, 0, 158, 118, 118, 18).color(shell));
p.part('slot', b(0, 0, 169, 56, 18, 4).color(accent));
p.part('handle-tab', b(0, 62, 157, 54, 16, 16).color(accent));

return p.model();
