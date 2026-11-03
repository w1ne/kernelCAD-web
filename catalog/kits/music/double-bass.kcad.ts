meta({
  "name": "double-bass",
  "license": "CC0-1.0",
  "title": "Double bass",
  "description": "Upright double bass with a large body, long neck, bridge and floor endpin.",
  "tags": [
    "double bass",
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
const color = param('color', "#755137", { label: 'Asset color' });
const p = assembly("double-bass");
p.part("lower-bout", sphere(148).scale([1.1, 0.34, 1]).translate(0, 0, 148).scale(scale).color(color));
p.part("upper-bout", sphere(98).scale([1.1, 0.34, 0.9]).translate(0, 0, 300).scale(scale).color(color));
p.part("neck", box(42, 26, 490, true).translate(0, 0, 654).scale(scale).color(color));
p.part("scroll", sphere(34).translate(0, 0, 956).scale(scale).color(color));
p.part("bridge", box(92, 22, 25, true).translate(0, 0, 171).scale(scale).color(color));
p.part("endpin", cylinder(72, 7, 8).translate(0, 0, 0).scale(scale).color(color));
p.part("strings", box(2, 3, 760, true).translate(0, 0, 515).scale(scale).color(color));

return p.model();
