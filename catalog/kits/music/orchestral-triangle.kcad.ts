meta({
  "name": "orchestral-triangle",
  "license": "CC0-1.0",
  "title": "Orchestral triangle",
  "description": "Metal triangle percussion instrument with a three-sided frame and hanging striker.",
  "tags": [
    "orchestral triangle",
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
const color = param('color', "#a9a69a", { label: 'Asset color' });
const p = assembly("orchestral-triangle");
p.part("left-side", box(8, 12, 164, true).rotate([0, 1, 0], 20).translate(-30, 0, 78.423).scale(scale).color(color));
p.part("right-side", box(8, 12, 164, true).rotate([0, 1, 0], -20).translate(30, 0, 78.423).scale(scale).color(color));
p.part("top-bar", box(66, 12, 12, true).translate(0, 0, 154).scale(scale).color(color));
p.part("striker", cylinder(128, 4, 8).translate(92, 0, 0).scale(scale).color(color));
p.part("striker-grip", sphere(10).translate(92, 0, 143).scale(scale).color(color));

return p.model();
