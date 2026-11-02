meta({
  "name": "cello",
  "license": "CC0-1.0",
  "title": "Cello",
  "description": "Seated cello with a broad resonant body, long neck, bridge and extended endpin.",
  "tags": [
    "cello",
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
const color = param('color', "#96653d", { label: 'Asset color' });
const p = assembly("cello");
p.part("lower-bout", sphere(118).scale([1.15, 0.34, 1]).translate(0, 0, 118).scale(scale).color(color));
p.part("upper-bout", sphere(80).scale([1.1, 0.34, 0.9]).translate(0, 0, 245).scale(scale).color(color));
p.part("neck", box(34, 22, 335, true).translate(0, 0, 448).scale(scale).color(color));
p.part("scroll", sphere(27).translate(0, 0, 655).scale(scale).color(color));
p.part("bridge", box(70, 18, 22, true).translate(0, 0, 135).scale(scale).color(color));
p.part("endpin", cylinder(46, 5, 8).translate(0, 0, 0).scale(scale).color(color));
p.part("strings", box(2, 3, 516, true).translate(0, 0, 376).scale(scale).color(color));

return p.model();
