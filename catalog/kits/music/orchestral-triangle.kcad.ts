// Distinctive silhouette: Metal triangle percussion instrument with a three-sided frame and hanging striker. Material controls: polished steel, maple striker, striker grip polymer; concert and vintage presets.
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
const steel = param('steel', '#b7c2c8', { label: 'Polished steel' });
const maple = param('maple', '#ae7745', { label: 'Maple striker' });
const rubber = param('rubber', '#292c2e', { label: 'Striker grip polymer' });

presets({
  concert: { steel: '#dce4e7' },
  vintage: { steel: '#998f81' },
});
const p = assembly("orchestral-triangle");
p.part("left-side", box(8, 12, 164, true).rotate([0, 1, 0], 20).translate(-30, 0, 78.423).scale(scale).color(steel));
p.part("right-side", box(8, 12, 164, true).rotate([0, 1, 0], -20).translate(30, 0, 78.423).scale(scale).color(steel));
p.part("top-bar", box(66, 12, 12, true).translate(0, 0, 154).scale(scale).color(steel));
p.part("striker", cylinder(128, 4, 8).translate(92, 0, 0).scale(scale).color(maple));
p.part("striker-grip", sphere(10).translate(92, 0, 143).scale(scale).color(rubber));

return p.model();
