meta({
  "name": "examination-light",
  "license": "CC0-1.0",
  "title": "Examination light",
  "description": "Clinic examination lamp with weighted base, tall support column, offset arm and broad low-poly lamp head.",
  "tags": [
    "examination light",
    "medical lamp",
    "clinic equipment",
    "treatment room",
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
  "triangleBudget": 450
});

const shell = param('shell', '#e5e9ea', { label: 'Shell' });
const accent = param('accent', '#6b8f98', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('examination-light');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('base', c(0, 0, 8, 16, 95, 10).color(shell));
for (const side of [-1, 1]) {
  p.part('base-leg-x-' + side, b(side * 58, 0, 6, 126, 20, 12).color(shell));
  p.part('base-leg-y-' + side, b(0, side * 58, 6, 20, 126, 12).color(shell));
  p.part('caster-' + side, c(side * 112, 0, 0, 22, 14, 8).color(accent));
}
p.part('column', c(0, 0, 14, 780, 12, 10).color(shell));
p.part('arm', b(115, 0, 810, 250, 18, 18).color(accent));
p.part('lamp-neck', c(0, 0, 0, 80, 10, 10).rotate([0, 1, 0], 65).translate(240, 0, 810).color(shell));
p.part('head', c(270, 0, 855, 24, 76, 12).color(accent));
p.part('light-face', c(270, 0, 855, 4, 58, 12).color(shell));

return p.model();
