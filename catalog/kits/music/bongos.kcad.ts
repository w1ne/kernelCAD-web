meta({
  "name": "bongos",
  "license": "CC0-1.0",
  "title": "Bongos",
  "description": "Small paired bongo drums joined by a center bridge and supported on a low base.",
  "tags": [
    "bongos",
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
const color = param('color', "#9a704d", { label: 'Asset color' });
const p = assembly("bongos");
p.part("left-shell", cylinder(105, 49, 10).translate(-52, 0, 12).scale(scale).color(color));
p.part("right-shell", cylinder(105, 49, 10).translate(52, 0, 12).scale(scale).color(color));
p.part("left-head", cylinder(9, 53, 10).translate(-52, 0, 110).scale(scale).color(color));
p.part("right-head", cylinder(9, 53, 10).translate(52, 0, 110).scale(scale).color(color));
p.part("bridge", box(60, 30, 26, true).translate(0, 0, 48).scale(scale).color(color));
p.part("base", box(180, 92, 14, true).translate(0, 0, 7).scale(scale).color(color));

return p.model();
