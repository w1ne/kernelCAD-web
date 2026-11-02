meta({
  "name": "first-aid-kit",
  "license": "CC0-1.0",
  "title": "First aid kit",
  "description": "Portable first-aid case with carry handle, front latches and raised medical cross for emergency and clinic scenes.",
  "tags": [
    "first aid kit",
    "medical case",
    "emergency kit",
    "healthcare",
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
  "triangleBudget": 350
});

const shell = param('shell', '#e8ecee', { label: 'Shell' });
const accent = param('accent', '#c8403a', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('first-aid-kit');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('case', b(0, 0, 41, 190, 120, 82).color(shell));
p.part('lid', b(0, 0, 88, 194, 124, 14).color(accent));
p.part('handle-left', b(-28, 0, 112, 18, 20, 32).color(shell));
p.part('handle-right', b(28, 0, 112, 18, 20, 32).color(shell));
p.part('handle-grip', b(0, 0, 128, 72, 20, 12).color(shell));
p.part('cross-vertical', b(0, -64, 44, 22, 4, 52).color(accent));
p.part('cross-horizontal', b(0, -64, 44, 54, 4, 20).color(accent));
p.part('latch-left', b(-58, -64, 12, 26, 8, 22).color(accent));
p.part('latch-right', b(58, -64, 12, 26, 8, 22).color(accent));

return p.model();
