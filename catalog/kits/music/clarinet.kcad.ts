meta({
  "name": "clarinet",
  "license": "CC0-1.0",
  "title": "Clarinet",
  "description": "Straight clarinet with a flared bell, mouthpiece and regularly spaced key pads.",
  "tags": [
    "clarinet",
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
const color = param('color', "#343c44", { label: 'Asset color' });
const p = assembly("clarinet");
p.part("barrel", cylinder(430, 17, 10).translate(0, 0, 0).scale(scale).color(color));
p.part("bell", sphere(38).scale([1, 1, 0.52]).translate(0, 0, 452).scale(scale).color(color));
p.part("mouthpiece", box(22, 20, 72, true).translate(0, 0, 537).scale(scale).color(color));
p.part("key-one", sphere(9).translate(-18, -8, 120).scale(scale).color(color));
p.part("key-two", sphere(9).translate(-18, -8, 174).scale(scale).color(color));
p.part("key-three", sphere(9).translate(-18, -8, 228).scale(scale).color(color));
p.part("key-four", sphere(9).translate(-18, -8, 282).scale(scale).color(color));
p.part("key-five", sphere(9).translate(-18, -8, 336).scale(scale).color(color));

return p.model();
