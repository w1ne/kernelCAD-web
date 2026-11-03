meta({
  "name": "concert-flute",
  "license": "CC0-1.0",
  "title": "Concert flute",
  "description": "Concert flute with an inline head joint and visible round key cups.",
  "tags": [
    "concert flute",
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
const color = param('color', "#a4a9a4", { label: 'Asset color' });
const p = assembly("concert-flute");
p.part("tube", cylinder(430, 14, 10).rotate([0, 1, 0], 90).translate(0, 0, 14).scale(scale).color(color));
p.part("head-joint", cylinder(94, 17, 10).rotate([0, 1, 0], 90).translate(-94, 0, 17).scale(scale).color(color));
p.part("key-one", cylinder(8, 12, 8).rotate([1, 0, 0], 90).translate(-90, 0, 25).scale(scale).color(color));
p.part("key-two", cylinder(8, 12, 8).rotate([1, 0, 0], 90).translate(-20, 0, 25).scale(scale).color(color));
p.part("key-three", cylinder(8, 12, 8).rotate([1, 0, 0], 90).translate(50, 0, 25).scale(scale).color(color));
p.part("key-four", cylinder(8, 12, 8).rotate([1, 0, 0], 90).translate(120, 0, 25).scale(scale).color(color));

return p.model();
