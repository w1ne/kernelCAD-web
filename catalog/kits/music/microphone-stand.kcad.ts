meta({
  "name": "microphone-stand",
  "license": "CC0-1.0",
  "title": "Microphone stand",
  "description": "Stage microphone on a tripod stand with an angled boom arm and round grille head.",
  "tags": [
    "microphone stand",
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
const color = param('color', "#69757a", { label: 'Asset color' });
const p = assembly("microphone-stand");
p.part("base-post", cylinder(530, 9, 8).translate(0, 0, 110).scale(scale).color(color));
p.part("base-foot-one", box(190, 15, 12, true).translate(0, 0, 6).scale(scale).color(color));
p.part("base-foot-two", box(15, 175, 12, true).translate(0, 0, 6).scale(scale).color(color));
p.part("base-foot-three", box(150, 15, 12, true).translate(0, 0, 6).scale(scale).color(color));
p.part("boom", box(300, 12, 12, true).translate(130, 0, 660).scale(scale).color(color));
p.part("boom-joint", sphere(19).translate(0, 0, 661).scale(scale).color(color));
p.part("microphone-body", cylinder(92, 19, 10).rotate([1, 0, 0], 90).translate(286, 0, 660).scale(scale).color(color));
p.part("microphone-grille", sphere(23).scale([1, 1, 0.7]).translate(286, 0, 709).scale(scale).color(color));
p.part("clip", box(18, 20, 38, true).translate(230, 0, 660).scale(scale).color(color));

return p.model();
