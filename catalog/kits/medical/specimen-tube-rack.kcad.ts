meta({
  "name": "specimen-tube-rack",
  "license": "CC0-1.0",
  "title": "Specimen tube rack",
  "description": "Bench-top tube rack with aligned sample tubes and contrasting caps for laboratory and blood-test scenes. Material controls: Rack polymer, Clear tube polymer, Color-coded cap polymer.",
  "tags": [
    "specimen tube rack",
    "test tube rack",
    "laboratory",
    "sample tubes",
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
  "triangleBudget": 500
});

// A specimen rack keeps color-coded capped tubes upright in a two-level support frame.
const medicalPolymer = param('medicalPolymer', '#d7dedf', { label: 'Rack polymer' });
const clearPolymer = param('clearPolymer', '#b5d1d0', { label: 'Clear tube polymer' });
const capPolymer = param('capPolymer', '#508c98', { label: 'Color-coded cap polymer' });
presets({
  clinic: { medicalPolymer: '#e4e9e8', clearPolymer: '#b9ddd8', capPolymer: '#2d9893' },
  emergency: { medicalPolymer: '#e8e3db', clearPolymer: '#c2d2cf', capPolymer: '#c9413b' },
});
const tubeCount = param('tubeCount', '4', { choices: ['3', '4', '5'], label: 'Tube count' });
const p = assembly('specimen-tube-rack');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('base', b(0, 0, 8, 190, 96, 16).color(medicalPolymer));
p.part('top-rail', b(0, 0, 48, 190, 96, 12).color(medicalPolymer));
const n = Number(tubeCount.value);
for (let i = 0; i < n; i++) {
  const x = -72 + i * (144 / (n - 1));
  p.part('tube-' + i, c(x, 0, 16, 66, 8, 8).color(clearPolymer));
  p.part('cap-' + i, c(x, 0, 80, 12, 9, 8).color(capPolymer));
}

return p.model();
