meta({
  "name": "harmonica",
  "license": "CC0-1.0",
  "title": "Harmonica",
  "description": "Compact harmonica with a rectangular body and repeated raised reed covers.",
  "tags": [
    "harmonica",
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
const color = param('color', "#888f91", { label: 'Asset color' });
const p = assembly("harmonica");
p.part("body", box(190, 56, 42, true).translate(0, 0, 25).scale(scale).color(color));
p.part("top-cover", box(202, 12, 22, true).translate(0, 0, 49).scale(scale).color(color));
p.part("bottom-cover", box(202, 12, 22, true).translate(0, 0, 11).scale(scale).color(color));
p.part("reed-one", box(12, 12, 16, true).translate(-78, -34, 25).scale(scale).color(color));
p.part("reed-two", box(12, 12, 16, true).translate(-52, -34, 25).scale(scale).color(color));
p.part("reed-three", box(12, 12, 16, true).translate(-26, -34, 25).scale(scale).color(color));
p.part("reed-four", box(12, 12, 16, true).translate(0, -34, 25).scale(scale).color(color));
p.part("reed-five", box(12, 12, 16, true).translate(26, -34, 25).scale(scale).color(color));
p.part("reed-six", box(12, 12, 16, true).translate(52, -34, 25).scale(scale).color(color));
p.part("reed-seven", box(12, 12, 16, true).translate(78, -34, 25).scale(scale).color(color));

return p.model();
