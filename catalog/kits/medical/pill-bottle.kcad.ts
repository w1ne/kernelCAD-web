meta({
  "name": "pill-bottle",
  "license": "CC0-1.0",
  "title": "Pill bottle",
  "description": "Small medicine bottle with screw cap, label band and broad stable base for pharmacy or bathroom props.",
  "tags": [
    "pill bottle",
    "medicine bottle",
    "pharmacy",
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
  "triangleBudget": 260
});

const shell = param('shell', '#f0f2ed', { label: 'Shell' });
const accent = param('accent', '#d8bd65', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('pill-bottle');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('bottle', c(0, 0, 0, 82, 27, 10).color(shell));
p.part('label', c(0, 0, 22, 38, 28, 10).color(accent));
p.part('neck', c(0, 0, 82, 15, 20, 10).color(shell));
p.part('cap', c(0, 0, 96, 24, 24, 10).color(accent));
p.part('cap-rim', c(0, 0, 94, 5, 26, 10).color(shell));

return p.model();
