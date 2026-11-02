meta({
  "name": "pill-blister-pack",
  "license": "CC0-1.0",
  "title": "Pill blister pack",
  "description": "Flat blister pack with a foil backing and repeated raised tablet pockets for medication scene dressing.",
  "tags": [
    "pill blister pack",
    "medicine",
    "pharmacy",
    "tablets",
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

const shell = param('shell', '#bfc9cd', { label: 'Shell' });
const accent = param('accent', '#d6b95f', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('pill-blister-pack');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('foil-card', b(0, 0, 5, 132, 84, 10).color(shell));
for (const x of [-42, 0, 42]) for (const y of [-24, 24]) {
  p.part('tablet-' + x + '-' + y, c(x, y, 10, 9, 13, 8).color(accent));
}
p.part('edge-band', b(0, 0, 11, 136, 8, 4).color(accent));

return p.model();
