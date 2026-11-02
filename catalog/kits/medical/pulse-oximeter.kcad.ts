meta({
  "name": "pulse-oximeter",
  "license": "CC0-1.0",
  "title": "Pulse oximeter",
  "description": "Compact fingertip pulse oximeter with hinged clamp, display panel and simple control button for first-aid scenes.",
  "tags": [
    "pulse oximeter",
    "finger monitor",
    "medical device",
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
  "triangleBudget": 300
});

const shell = param('shell', '#eef2f2', { label: 'Shell' });
const accent = param('accent', '#399da1', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('pulse-oximeter');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('lower-jaw', b(0, 0, 14, 92, 42, 28).color(shell));
p.part('upper-jaw', box(82, 42, 24, true).rotate([0, 1, 0], -7).translate(-4, 0, 53).color(shell));
p.part('hinge', c(0, 0, 0, 48, 8, 8).rotate([0, 1, 0], 90).translate(-24, 0, 38).color(accent));
p.part('display', b(0, -22, 58, 48, 4, 20).color(accent));
p.part('button', c(28, -24, 57, 4, 5, 8).color(shell));

return p.model();
