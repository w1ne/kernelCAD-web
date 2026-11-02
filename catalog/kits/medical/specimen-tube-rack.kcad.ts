meta({
  "name": "specimen-tube-rack",
  "license": "CC0-1.0",
  "title": "Specimen tube rack",
  "description": "Bench-top tube rack with aligned sample tubes and contrasting caps for laboratory and blood-test scenes.",
  "tags": [
    "specimen tube rack",
    "test tube rack",
    "laboratory",
    "sample tubes",
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
  "triangleBudget": 500
});

const shell = param('shell', '#d7dedf', { label: 'Shell' });
const accent = param('accent', '#508c98', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const tubeCount = param('tubeCount', '4', { choices: ['3', '4', '5'], label: 'Tube count' });
const p = assembly('specimen-tube-rack');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('base', b(0, 0, 8, 190, 96, 16).color(shell));
p.part('top-rail', b(0, 0, 48, 190, 96, 12).color(accent));
const n = Number(tubeCount.value);
for (let i = 0; i < n; i++) {
  const x = -72 + i * (144 / (n - 1));
  p.part('tube-' + i, c(x, 0, 16, 66, 8, 8).color(shell));
  p.part('cap-' + i, c(x, 0, 80, 12, 9, 8).color(accent));
}

return p.model();
