meta({
  "name": "centrifuge",
  "license": "CC0-1.0",
  "title": "Laboratory centrifuge",
  "description": "Compact bench-top centrifuge with lidded rotor housing, simple control panel and feet for laboratory scenes.",
  "tags": [
    "centrifuge",
    "lab equipment",
    "sample processing",
    "science",
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
  "triangleBudget": 400
});

const shell = param('shell', '#dfe5e6', { label: 'Shell' });
const accent = param('accent', '#347c84', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('centrifuge');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', b(0, 0, 48, 190, 180, 96).color(shell));
p.part('lid', c(0, 0, 95, 28, 78, 12).color(accent));
p.part('rotor-hub', c(0, 0, 123, 10, 20, 10).color(shell));
p.part('panel', b(0, -94, 63, 100, 4, 40).color(accent));
p.part('display', b(0, -97, 73, 56, 3, 17).color(shell));
for (const x of [-34, 0, 34]) p.part('button-' + x, c(x, -99, 50, 5, 6, 8).color(shell));
for (const x of [-70, 70]) p.part('foot-' + x, b(x, 0, 8, 26, 30, 16).color(accent));

return p.model();
