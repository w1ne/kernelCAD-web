meta({
  "name": "snare-drum",
  "license": "CC0-1.0",
  "title": "Snare drum",
  "description": "Snare drum with a shallow shell, paired hoops and a simple carry-stand frame.",
  "tags": [
    "snare drum",
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
const color = param('color', "#9b7b55", { label: 'Asset color' });
const p = assembly("snare-drum");
p.part("shell", cylinder(72, 76, 12).translate(0, 0, 84).scale(scale).color(color));
p.part("top-hoop", cylinder(10, 82, 12).subtract(cylinder(12, 70, 12).translate(0, 0, -1)).translate(0, 0, 150).scale(scale).color(color));
p.part("bottom-hoop", cylinder(10, 82, 12).subtract(cylinder(12, 70, 12).translate(0, 0, -1)).translate(0, 0, 81).scale(scale).color(color));
p.part("stand-post", cylinder(78, 7, 8).translate(0, 0, 4).scale(scale).color(color));
p.part("stand-foot-one", box(105, 10, 8, true).translate(0, 0, 4).scale(scale).color(color));
p.part("stand-foot-two", box(10, 100, 8, true).translate(0, 0, 4).scale(scale).color(color));

return p.model();
