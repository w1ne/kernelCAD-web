meta({
  "name": "specimen-cup",
  "license": "CC0-1.0",
  "title": "Specimen cup",
  "description": "Small specimen cup with screw lid, wide rim and tapered-looking base for a clinic or laboratory sample prop.",
  "tags": [
    "specimen cup",
    "sample container",
    "laboratory",
    "clinic",
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
  "triangleBudget": 300
});

const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#e8eceb', { label: 'Shell' });
const accent = param('accent', '#e6ba54', { label: 'Accent' });
presets({
  clinic: { shell: '#f1f3f4', accent: '#2d9893' },
  emergency: { shell: '#ebe8df', accent: '#c9413b' },
});
const p = assembly('specimen-cup');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('cup', c(0, 0, 0, 62, 27, 10).color(shell).scale(overallScale));
p.part('base-foot', c(0, 0, 0, 8, 23, 10).color(accent).scale(overallScale));
p.part('lid', c(0, 0, 61, 13, 30, 10).color(accent).scale(overallScale));
p.part('lid-rim', c(0, 0, 58, 5, 32, 10).color(shell).scale(overallScale));

return p.model();
