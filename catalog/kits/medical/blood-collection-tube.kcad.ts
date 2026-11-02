meta({
  "name": "blood-collection-tube",
  "license": "CC0-1.0",
  "title": "Blood collection tube",
  "description": "Single low-poly blood collection tube with colored cap and sample barrel for diagnostic laboratory scenes.",
  "tags": [
    "blood collection tube",
    "vacutainer",
    "lab sample",
    "medical",
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

const shell = param('shell', '#d7e4e4', { label: 'Shell' });
const accent = param('accent', '#855b9a', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('blood-collection-tube');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('tube', c(0, 0, 0, 92, 10, 8).color(shell));
p.part('cap', c(0, 0, 90, 22, 12, 8).color(accent));
p.part('cap-ridge', c(0, 0, 104, 4, 13, 8).color(shell));
p.part('label-band', c(0, 0, 38, 32, 10.5, 8).color(accent));

return p.model();
