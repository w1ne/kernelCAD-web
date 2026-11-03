meta({
  "name": "maracas",
  "license": "CC0-1.0",
  "title": "Maracas",
  "description": "Pair of hand maracas with rounded shaker heads and straight handles.",
  "tags": [
    "maracas",
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
const color = param('color', "#a47642", { label: 'Asset color' });
const p = assembly("maracas");
p.part("left-head", sphere(44).translate(-58, 0, 92).scale(scale).color(color));
p.part("right-head", sphere(44).translate(58, 0, 92).scale(scale).color(color));
p.part("left-handle", cylinder(90, 10, 8).translate(-58, 0, 0).scale(scale).color(color));
p.part("right-handle", cylinder(90, 10, 8).translate(58, 0, 0).scale(scale).color(color));
p.part("left-neck", cylinder(24, 15, 8).translate(-58, 0, 68).scale(scale).color(color));
p.part("right-neck", cylinder(24, 15, 8).translate(58, 0, 68).scale(scale).color(color));

return p.model();
