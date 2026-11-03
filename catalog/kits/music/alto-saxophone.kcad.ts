meta({
  "name": "alto-saxophone",
  "license": "CC0-1.0",
  "title": "Alto saxophone",
  "description": "Saxophone with bent neck, broad bell and raised pearl-like key buttons.",
  "tags": [
    "alto saxophone",
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
const color = param('color', "#a18a4b", { label: 'Asset color' });
const p = assembly("alto-saxophone");
p.part("body", cylinder(300, 28, 10).translate(0, 0, 42).scale(scale).color(color));
p.part("lower-body", sphere(50).scale([0.7, 0.72, 1.2]).translate(24, 0, 60).scale(scale).color(color));
p.part("bell", sphere(58).scale([1, 1, 0.42]).translate(24, 0, 370).scale(scale).color(color));
p.part("crook", box(75, 20, 18, true).translate(-21, 0, 350).scale(scale).color(color));
p.part("neck", cylinder(82, 12, 8).rotate([1, 0, 0], 90).translate(-52, 0, 349).scale(scale).color(color));
p.part("key-rail", box(13, 20, 196, true).translate(-34, -22, 205).scale(scale).color(color));
p.part("keys", box(18, 10, 12, true).translate(-24, -30, 145).scale(scale).color(color));
p.part("keys-upper", box(18, 10, 12, true).translate(-24, -30, 193).scale(scale).color(color));
p.part("keys-top", box(18, 10, 12, true).translate(-24, -30, 241).scale(scale).color(color));

return p.model();
