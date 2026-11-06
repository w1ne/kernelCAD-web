meta({
  "name": "petri-dish",
  "license": "CC0-1.0",
  "title": "Petri dish",
  "description": "Shallow low-poly Petri dish with separate-looking base and lid rims for biology and laboratory bench scenes. Material controls: Clear dish polymer, Agar medium, Sample label paper.",
  "tags": [
    "petri dish",
    "culture dish",
    "laboratory",
    "biology",
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

// A culture dish uses a shallow clear polymer base, fitted lid and a visible agar sample.
const clearPolymer = param('clearPolymer', '#e1e8e7', { label: 'Clear dish polymer' });
const agar = param('agar', '#80b8a0', { label: 'Agar medium' });
const labelPaper = param('labelPaper', '#f2eee3', { label: 'Sample label paper' });
presets({
  clinic: { clearPolymer: '#d9e9e6', agar: '#73b89a', labelPaper: '#f4f1e7' },
  emergency: { clearPolymer: '#e4e4dd', agar: '#d08a68', labelPaper: '#eee3d6' },
});
const p = assembly('petri-dish');
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', c(0, 0, 0, 12, 42, 12).color(clearPolymer));
p.part('base-rim', c(0, 0, 10, 4, 45, 12).color(clearPolymer));
p.part('lid', c(0, 0, 14, 7, 43, 12).color(clearPolymer));
p.part('lid-lip', c(0, 0, 18, 3, 46, 12).color(clearPolymer));

p.part('culture-agar', c(0, 0, 12, 2, 32, 12).color(agar));
p.part('sample-label', box(24, 2, 10, true).translate(0, -42, 7).color(labelPaper));

return p.model();
