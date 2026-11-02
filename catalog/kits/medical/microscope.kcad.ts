meta({
  "name": "microscope",
  "license": "CC0-1.0",
  "title": "Microscope",
  "description": "Compound microscope with base, upright arm, stage, objective cluster and angled eyepiece for a low-poly lab scene.",
  "tags": [
    "microscope",
    "laboratory equipment",
    "science",
    "diagnostics",
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
  "triangleBudget": 500
});

const shell = param('shell', '#56636a', { label: 'Shell' });
const accent = param('accent', '#8bb5b4', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('microscope');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);
const poly = (points: [number, number][], z: number, depth: number) => extrudePolygon(points, depth).translate(0, 0, z);

p.part('base', b(0, 0, 12, 150, 110, 24).color(shell));
p.part('foot', b(0, 24, 90, 72, 76, 150).color(shell));
p.part('arm', box(70, 28, 190, true).rotate([0, 1, 0], -12).translate(0, 48, 180).color(accent));
p.part('stage', b(0, -4, 190, 140, 100, 18).color(shell));
p.part('stage-clip-left', b(-48, -8, 202, 26, 18, 10).color(accent));
p.part('stage-clip-right', b(48, -8, 202, 26, 18, 10).color(accent));
p.part('tube', c(0, 0, 0, 105, 18, 10).rotate([0, 1, 0], -12).translate(0, 0, 270).color(shell));
p.part('eyepiece', c(0, 0, 365, 40, 22, 10).color(accent));
for (const x of [-24, 0, 24]) p.part('objective-' + x, c(x, -18, 230, 52, 8, 8).color(accent));

return p.model();
