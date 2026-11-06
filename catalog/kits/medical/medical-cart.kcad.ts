meta({
  "name": "medical-cart",
  "license": "CC0-1.0",
  "title": "Medical cart",
  "description": "Rolling medical cart with two shelves, corner posts, raised tray lips and four low-poly casters for treatment scenes. Material controls: Stainless steel, Polymer shelf lips, Rubber casters.",
  "tags": [
    "medical cart",
    "clinic trolley",
    "hospital equipment",
    "ward",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "furniture",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 600
});

// A medical cart has tiered steel shelves, raised polymer lips and four swivel casters.
const stainlessSteel = param('stainlessSteel', '#dce3e4', { label: 'Stainless steel' });
const medicalPolymer = param('medicalPolymer', '#3c7f87', { label: 'Polymer shelf lips' });
const rubber = param('rubber', '#343c40', { label: 'Rubber casters' });
presets({
  clinic: { stainlessSteel: '#e8eeee', medicalPolymer: '#2d9893', rubber: '#485356' },
  emergency: { stainlessSteel: '#e6e1d9', medicalPolymer: '#c9413b', rubber: '#514d4a' },
});
const shelfCount = param('shelves', '2', { choices: ['1', '2'], label: 'Shelf count' });
const p = assembly('medical-cart');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

for (let i = 0; i < Number(shelfCount.value); i++) {
  const z = i === 0 ? 180 : 560;
  p.part('shelf-' + i, b(0, 0, z, 420, 300, 24).color(stainlessSteel));
  p.part('lip-' + i, b(0, -143, z + 20, 420, 14, 18).color(medicalPolymer));
}
for (const x of [-185, 185]) for (const y of [-125, 125]) {
  p.part('post-' + x + '-' + y, c(x, y, 0, 730, 10, 8).color(stainlessSteel));
  p.part('wheel-' + x + '-' + y, c(x, y, 0, 18, 16, 8).color(rubber));
}

return p.model();
