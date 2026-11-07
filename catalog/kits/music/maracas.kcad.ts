// Distinctive silhouette: Pair of hand maracas with rounded shaker heads and straight handles. Material controls: painted gourd shells, maple handles; concert and vintage presets.
meta({
  "name": "maracas",
  "license": "CC0-1.0",
  "title": "Maracas",
  "description": "Pair of hand maracas with rounded shaker heads and straight handles.",
  "tags": [
    "maracas",
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
const paint = param('paint', '#d5a82e', { label: 'Painted gourd shells' });
const maple = param('maple', '#a86a36', { label: 'Maple handles' });

presets({
  concert: { paint: '#dd6532' },
  vintage: { paint: '#9b4b2e' },
});
const p = assembly("maracas");
p.part("left-head", sphere(44).translate(-58, 0, 92).scale(scale).color(paint));
p.part("right-head", sphere(44).translate(58, 0, 92).scale(scale).color(paint));
p.part("left-handle", cylinder(90, 10, 8).translate(-58, 0, 0).scale(scale).color(maple));
p.part("right-handle", cylinder(90, 10, 8).translate(58, 0, 0).scale(scale).color(maple));
p.part("left-neck", cylinder(24, 15, 8).translate(-58, 0, 68).scale(scale).color(maple));
p.part("right-neck", cylinder(24, 15, 8).translate(58, 0, 68).scale(scale).color(maple));

return p.model();
