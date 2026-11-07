meta({
  "name": "tuba",
  "license": "CC0-1.0",
  "title": "Tuba",
  "description": "Compact tuba with a large bell, looping body tube and front-facing valve buttons.",
  "tags": [
    "tuba",
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
const color = param('color', "#988148", { label: 'Asset color' });
const p = assembly("tuba");
p.part("main-bell", sphere(83).scale([1, 1, 0.5]).translate(0, 0, 203).scale(scale).color(color));
p.part("bell-neck", cylinder(150, 24, 10).translate(0, 0, 145).scale(scale).color(color));
p.part("lower-loop", cylinder(20, 92, 12).subtract(cylinder(22, 66, 12).translate(0, 0, -1)).translate(0, 0, 0).scale(scale).color(color));
p.part("body", sphere(86).scale([0.78, 0.6, 0.78]).translate(50, 0, 95).scale(scale).color(color));
p.part("valve-one", cylinder(55, 9, 8).translate(15, -26, 62).scale(scale).color(color));
p.part("valve-two", cylinder(55, 9, 8).translate(40, -26, 62).scale(scale).color(color));
p.part("valve-three", cylinder(55, 9, 8).translate(65, -26, 62).scale(scale).color(color));

return p.model();
