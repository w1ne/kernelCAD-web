meta({
  "name": "banjo",
  "license": "CC0-1.0",
  "title": "Banjo",
  "description": "Banjo with a circular resonator, narrow neck, bridge and tuning head.",
  "tags": [
    "banjo",
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
const color = param('color', "#806c55", { label: 'Asset color' });
const p = assembly("banjo");
p.part("resonator", cylinder(24, 76, 12).translate(0, 0, 0).scale(scale).color(color));
p.part("rim", cylinder(12, 82, 12).subtract(cylinder(14, 70, 12).translate(0, 0, -1)).translate(0, 0, 26).scale(scale).color(color));
p.part("neck", box(28, 20, 300, true).translate(0, 0, 203).scale(scale).color(color));
p.part("head", box(42, 24, 52, true).translate(0, 0, 378).scale(scale).color(color));
p.part("bridge", box(42, 10, 12, true).translate(0, 0, 43).scale(scale).color(color));
p.part("strings", box(2, 2, 358, true).translate(0, 0, 203).scale(scale).color(color));

return p.model();
