meta({
  "name": "tambourine",
  "license": "CC0-1.0",
  "title": "Tambourine",
  "description": "Hand tambourine with a broad ring and evenly spaced pairs of jingles.",
  "tags": [
    "tambourine",
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
const color = param('color', "#9e8050", { label: 'Asset color' });
const p = assembly("tambourine");
p.part("ring", cylinder(24, 93, 12).subtract(cylinder(26, 69, 12).translate(0, 0, -1)).translate(0, 0, 0).scale(scale).color(color));
p.part("jingle-one", sphere(17).scale([1, 1, 0.25]).translate(0, 0, 83).scale(scale).color(color));
p.part("jingle-two", sphere(17).scale([1, 1, 0.25]).translate(68, 0, 83).scale(scale).color(color));
p.part("jingle-three", sphere(17).scale([1, 1, 0.25]).translate(-68, 0, 83).scale(scale).color(color));
p.part("jingle-four", sphere(17).scale([1, 1, 0.25]).translate(0, 68, 83).scale(scale).color(color));
p.part("jingle-five", sphere(17).scale([1, 1, 0.25]).translate(0, -68, 83).scale(scale).color(color));

return p.model();
