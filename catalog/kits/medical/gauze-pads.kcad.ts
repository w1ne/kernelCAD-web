meta({
  "name": "gauze-pads",
  "license": "CC0-1.0",
  "title": "Gauze pads",
  "description": "Stack of folded gauze pads with layered edges for a first-aid cabinet or clinic supply tray.",
  "tags": [
    "gauze pads",
    "dressing",
    "first aid",
    "medical supplies",
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

const shell = param('shell', '#f1eee7', { label: 'Shell' });
const accent = param('accent', '#c8d0d1', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('gauze-pads');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

for (let i = 0; i < 4; i++) p.part('pad-' + i, b(0, 0, 5 + i * 7, 88, 88, 10).color(shell));
p.part('woven-center', b(0, 0, 34, 62, 62, 2).color(accent));
p.part('fold-band', b(0, 43, 18, 88, 4, 8).color(accent));

return p.model();
