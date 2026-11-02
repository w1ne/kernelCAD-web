meta({
  "name": "reflex-hammer",
  "license": "CC0-1.0",
  "title": "Reflex hammer",
  "description": "Compact neurological reflex hammer with long handle and soft double-ended head for examination scenes.",
  "tags": [
    "reflex hammer",
    "neurological exam",
    "doctor tool",
    "medical instrument",
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
  "triangleBudget": 220
});

const shell = param('shell', '#a7b0b3', { label: 'Shell' });
const accent = param('accent', '#596a70', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('reflex-hammer');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('handle', c(0, 0, 0, 145, 9, 8).color(shell));
p.part('head-bar', b(0, 0, 152, 86, 20, 20).color(accent));
p.part('tip-left', c(-42, 0, 152, 18, 14, 8).color(shell));
p.part('tip-right', c(42, 0, 152, 18, 14, 8).color(shell));
p.part('collar', c(0, 0, 138, 8, 14, 8).color(accent));

return p.model();
