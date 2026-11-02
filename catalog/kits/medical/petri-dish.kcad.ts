meta({
  "name": "petri-dish",
  "license": "CC0-1.0",
  "title": "Petri dish",
  "description": "Shallow low-poly Petri dish with separate-looking base and lid rims for biology and laboratory bench scenes.",
  "tags": [
    "petri dish",
    "culture dish",
    "laboratory",
    "biology",
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
  "triangleBudget": 240
});

const shell = param('shell', '#e1e8e7', { label: 'Shell' });
const accent = param('accent', '#9fc6c0', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('petri-dish');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('base', c(0, 0, 0, 12, 42, 12).color(shell));
p.part('base-rim', c(0, 0, 10, 4, 45, 12).color(accent));
p.part('lid', c(0, 0, 14, 7, 43, 12).color(shell));
p.part('lid-lip', c(0, 0, 18, 3, 46, 12).color(accent));

return p.model();
