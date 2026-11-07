// Distinctive silhouette: Tabletop xylophone with graduated wooden bars and crossed support legs. Material controls: rosewood bars, steel frame; concert and vintage presets.
meta({
  "name": "xylophone",
  "license": "CC0-1.0",
  "title": "Xylophone",
  "description": "Tabletop xylophone with graduated wooden bars and crossed support legs.",
  "tags": [
    "xylophone",
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
const rosewood = param('rosewood', '#945631', { label: 'Rosewood bars' });
const steel = param('steel', '#39444a', { label: 'Steel frame' });

presets({
  concert: { rosewood: '#b16b39' },
  vintage: { rosewood: '#633c2c' },
});
const p = assembly("xylophone");
p.part("bar-one", box(210, 28, 15, true).translate(0, -74, 120).scale(scale).color(rosewood));
p.part("bar-two", box(190, 28, 15, true).translate(0, -37, 120).scale(scale).color(rosewood));
p.part("bar-three", box(170, 28, 15, true).translate(0, 0, 120).scale(scale).color(rosewood));
p.part("bar-four", box(150, 28, 15, true).translate(0, 37, 120).scale(scale).color(rosewood));
p.part("bar-five", box(130, 28, 15, true).translate(0, 74, 120).scale(scale).color(rosewood));
p.part("frame-left", box(18, 195, 28, true).translate(-100, 0, 80).scale(scale).color(steel));
p.part("frame-right", box(18, 195, 28, true).translate(100, 0, 80).scale(scale).color(steel));
p.part("leg-left", box(18, 18, 75, true).translate(-90, 0, 38).scale(scale).color(steel));
p.part("leg-right", box(18, 18, 75, true).translate(90, 0, 38).scale(scale).color(steel));
p.part("mallet", cylinder(155, 5, 8).translate(135, 0, 0).scale(scale).color(rosewood));

return p.model();
