meta({
  "name": "digital-thermometer",
  "license": "CC0-1.0",
  "title": "Digital thermometer",
  "description": "Slim digital thermometer with tapered probe, small display and cap detail for first-aid and clinic scenes.",
  "tags": [
    "digital thermometer",
    "temperature",
    "medical tool",
    "first aid",
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

const shell = param('shell', '#e4e9eb', { label: 'Shell' });
const accent = param('accent', '#4d9ca0', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('digital-thermometer');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('body', b(0, 0, 66, 22, 14, 132).color(shell));
p.part('probe', c(0, 0, 0, 20, 5, 8).color(accent));
p.part('display', b(0, -8, 88, 14, 3, 26).color(accent));
p.part('button', c(0, -9, 58, 4, 4, 8).color(shell));
p.part('end-cap', c(0, 0, 126, 12, 11, 8).color(accent));

return p.model();
