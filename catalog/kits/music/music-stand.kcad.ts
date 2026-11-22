// Distinctive silhouette: Portable music stand with a broad score tray, adjustable stem and three floor feet. Material controls: powder-coated steel, aluminum tray, rubber feet; concert and vintage presets.
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
const steel = param('steel', '#3b525f', { label: 'Powder-coated steel' });
const aluminum = param('aluminum', '#7d8d95', { label: 'Aluminum tray' });
const rubber = param('rubber', '#25292c', { label: 'Rubber feet' });

presets({
  concert: { steel: '#b23d3d' },
  vintage: { steel: '#33383b' },
});
const p = assembly("music-stand");
p.part("tray", box(240, 20, 175, true).translate(0, 0, 460).scale(scale).color(aluminum));
p.part("tray-lip", box(250, 26, 18, true).translate(0, -18, 372).scale(scale).color(aluminum));
p.part("stem", cylinder(365, 10, 8).translate(0, 0, 90).scale(scale).color(steel));
p.part("collar", cylinder(26, 18, 8).translate(0, 0, 270).scale(scale).color(steel));
p.part("foot-one", box(170, 16, 14, true).translate(0, 0, 7).scale(scale).color(rubber));
p.part("foot-two", box(16, 155, 14, true).translate(0, 0, 7).scale(scale).color(rubber));
p.part("foot-three", box(142, 16, 14, true).translate(0, 0, 7).scale(scale).color(rubber));

return p.model();
