meta({
  "name": "electric-guitar",
  "license": "CC0-1.0",
  "title": "Electric guitar",
  "description": "Solid-body electric guitar with a double-cutaway silhouette, pickup bars, bridge and headstock.",
  "tags": [
    "electric guitar",
    "music",
    "instrument",
    "orchestra",
    "low poly",
    "CC0"
  ],
  "kit": "music",
  "category": "prop",
  "origin": "base",
  "compat": [
    "music",
    "orchestra",
    "stage",
    "indoor"
  ],
  "triangleBudget": 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#455c78", { label: 'Asset color' });
const p = assembly("electric-guitar");
p.part("lower-body", sphere(82).scale([1.1, 0.38, 1]).translate(0, 0, 82).scale(scale).color(color));
p.part("upper-body", sphere(58).scale([1.0, 0.38, 0.85]).translate(0, 0, 144).scale(scale).color(color));
p.part("neck", box(32, 20, 380, true).translate(0, 0, 330).scale(scale).color(color));
p.part("head", box(44, 24, 64, true).translate(0, 0, 552).scale(scale).color(color));
p.part("bridge", box(58, 14, 13, true).translate(0, 0, 25).scale(scale).color(color));
p.part("neck-pickup", box(52, 12, 10, true).translate(0, 0, 132).scale(scale).color(color));
p.part("bridge-pickup", box(52, 12, 10, true).translate(0, 0, 88).scale(scale).color(color));
p.part("strings", box(2, 3, 490, true).translate(0, 0, 280).scale(scale).color(color));

return p.model();
