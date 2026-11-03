meta({
  "name": "ukulele",
  "license": "CC0-1.0",
  "title": "Ukulele",
  "description": "Compact four-string ukulele with a rounded body, short neck, bridge and sound hole.",
  "tags": [
    "ukulele",
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
const color = param('color', "#b5834f", { label: 'Asset color' });
const p = assembly("ukulele");
p.part("body", sphere(68).scale([1.25, 0.38, 1]).translate(0, 0, 68).scale(scale).color(color));
p.part("upper-bout", sphere(42).scale([1.0, 0.38, 0.85]).translate(0, 0, 116).scale(scale).color(color));
p.part("neck", box(25, 16, 210, true).translate(0, 0, 195).scale(scale).color(color));
p.part("head", box(38, 20, 45, true).translate(0, 0, 323).scale(scale).color(color));
p.part("bridge", box(42, 9, 9, true).translate(0, 0, 19).scale(scale).color(color));
p.part("sound-hole", cylinder(5, 22, 10).subtract(cylinder(7, 16, 10).translate(0, 0, -1)).translate(0, 0, 76).scale(scale).color(color));
p.part("strings", box(2, 2, 280, true).translate(0, 0, 160).scale(scale).color(color));

return p.model();
