meta({
  "name": "music-stand",
  "license": "CC0-1.0",
  "title": "Music stand",
  "description": "Portable music stand with a broad score tray, adjustable stem and three floor feet.",
  "tags": [
    "music stand",
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
const color = param('color', "#66747b", { label: 'Asset color' });
const p = assembly("music-stand");
p.part("tray", box(240, 20, 175, true).translate(0, 0, 460).scale(scale).color(color));
p.part("tray-lip", box(250, 26, 18, true).translate(0, -18, 372).scale(scale).color(color));
p.part("stem", cylinder(365, 10, 8).translate(0, 0, 90).scale(scale).color(color));
p.part("collar", cylinder(26, 18, 8).translate(0, 0, 270).scale(scale).color(color));
p.part("foot-one", box(170, 16, 14, true).translate(0, 0, 7).scale(scale).color(color));
p.part("foot-two", box(16, 155, 14, true).translate(0, 0, 7).scale(scale).color(color));
p.part("foot-three", box(142, 16, 14, true).translate(0, 0, 7).scale(scale).color(color));

return p.model();
