meta({
  "name": "stethoscope",
  "license": "CC0-1.0",
  "title": "Stethoscope",
  "description": "Low-poly stethoscope with flexible Y-shaped tubing, paired earpieces and round chestpiece for a doctor or nurse prop.",
  "tags": [
    "stethoscope",
    "doctor tool",
    "medical instrument",
    "clinic",
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
  "triangleBudget": 350
});

const shell = param('shell', '#384b56', { label: 'Shell' });
const accent = param('accent', '#bfc8cb', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('stethoscope');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('tubing', poly([[-78, 105], [-62, 105], [-62, -4], [-42, -42], [0, -64], [42, -42], [62, -4], [62, 88], [78, 88], [78, -4], [53, -56], [0, -84], [-53, -56], [-78, -4]], 0, 10).color(shell));
p.part('earpiece-left', c(-70, 102, 0, 34, 8, 8).color(accent));
p.part('earpiece-right', c(70, 88, 0, 34, 8, 8).color(accent));
p.part('chestpiece', c(0, -74, 0, 12, 28, 12).color(accent));
p.part('diaphragm', c(0, -74, 12, 5, 22, 12).color(shell));

return p.model();
