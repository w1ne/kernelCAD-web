meta({
  "name": "violin",
  "license": "CC0-1.0",
  "title": "Violin",
  "description": "Faceted violin with an hourglass body, raised neck, bridge and four strings.",
  "tags": [
    "violin",
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
const color = param('color', "#a46e3f", { label: 'Asset color' });
const p = assembly("violin");
p.part("lower-bout", sphere(58).scale([1.3, 0.32, 1]).translate(0, 0, 58).scale(scale).color(color));
p.part("upper-bout", sphere(48).scale([1.2, 0.32, 0.92]).translate(0, 0, 139).scale(scale).color(color));
p.part("neck", box(22, 16, 194, true).translate(0, 0, 236).scale(scale).color(color));
p.part("scroll", sphere(19).translate(0, 0, 349).scale(scale).color(color));
p.part("bridge", box(42, 12, 15, true).translate(0, 0, 64).scale(scale).color(color));
p.part("strings", box(2, 2, 280, true).translate(0, 0, 196).scale(scale).color(color));

return p.model();
