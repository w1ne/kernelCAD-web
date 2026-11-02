meta({
  "name": "tongue-depressor-pack",
  "license": "CC0-1.0",
  "title": "Tongue depressor pack",
  "description": "Neatly stacked low-poly tongue depressors in a simple paper sleeve for examination room scenes.",
  "tags": [
    "tongue depressor pack",
    "tongue depressor",
    "medical supplies",
    "clinic",
    "wooden spatula",
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

const shell = param('shell', '#d9c29a', { label: 'Shell' });
const accent = param('accent', '#f1eee4', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('tongue-depressor-pack');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('sleeve', b(0, 0, 10, 140, 38, 20).color(accent));
for (let i = 0; i < 5; i++) p.part('depressor-' + i, b(0, 0, 23 + i * 3, 118, 24, 3).color(shell));
p.part('end-band', b(0, -21, 10, 48, 2, 20).color(shell));

return p.model();
