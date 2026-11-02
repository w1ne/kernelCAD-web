meta({
  "name": "acoustic-guitar",
  "license": "CC0-1.0",
  "title": "Acoustic guitar",
  "description": "Low-poly acoustic guitar with a waisted body, sound hole, long neck and tuning head.",
  "tags": [
    "acoustic guitar",
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
const color = param('color', "#9a6842", { label: 'Asset color' });
const p = assembly("acoustic-guitar");
p.part("body", sphere(92).scale([1.35, 0.38, 1]).translate(0, 0, 92).subtract(cylinder(100, 26, 12).rotate([1, 0, 0], 90).translate(0, 50, 80)).scale(scale).color(color));
p.part("upper-bout", sphere(57).scale([1.0, 0.36, 0.9]).translate(0, 0, 158).scale(scale).color(color));
p.part("neck", box(34, 22, 372, true).translate(0, 0, 340).scale(scale).color(color));
p.part("head", box(48, 26, 74, true).translate(0, 0, 558).scale(scale).color(color));
p.part("bridge", box(55, 12, 12, true).translate(0, 0, 27).scale(scale).color(color));
p.part("string-set", box(2, 3, 500, true).translate(0, 0, 285).scale(scale).color(color));

return p.model();
