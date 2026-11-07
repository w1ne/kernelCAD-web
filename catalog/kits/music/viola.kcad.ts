meta({
  "name": "viola",
  "license": "CC0-1.0",
  "title": "Viola",
  "description": "Slightly larger viola prop with an hourglass body, neck, bridge and four strings.",
  "tags": [
    "viola",
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
const color = param('color', "#92633f", { label: 'Asset color' });
const p = assembly("viola");
p.part("lower-bout", sphere(67).scale([1.3, 0.32, 1]).translate(0, 0, 67).scale(scale).color(color));
p.part("upper-bout", sphere(54).scale([1.2, 0.32, 0.92]).translate(0, 0, 157).scale(scale).color(color));
p.part("neck", box(24, 17, 208, true).translate(0, 0, 262).scale(scale).color(color));
p.part("scroll", sphere(20).translate(0, 0, 383).scale(scale).color(color));
p.part("bridge", box(47, 12, 15, true).translate(0, 0, 74).scale(scale).color(color));
p.part("strings", box(2, 2, 310, true).translate(0, 0, 220).scale(scale).color(color));

return p.model();
