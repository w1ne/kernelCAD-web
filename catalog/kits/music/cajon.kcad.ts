// Distinctive silhouette: Peruvian box drum with a broad front striking panel, low-profile feet and top seat edge. Material controls: birch cabinet, rosewood striking panel, rubber feet; concert and vintage presets.
meta({
  "name": "cajon",
  "license": "CC0-1.0",
  "title": "Cajon",
  "description": "Peruvian box drum with a broad front striking panel, low-profile feet and top seat edge.",
  "tags": [
    "cajon",
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
const birch = param('birch', '#ba8248', { label: 'Birch cabinet' });
const rosewood = param('rosewood', '#8a482f', { label: 'Rosewood striking panel' });
const rubber = param('rubber', '#292a2c', { label: 'Rubber feet' });

presets({
  concert: { birch: '#d39a58' },
  vintage: { birch: '#845334' },
});
const p = assembly("cajon");
p.part("body", box(310, 300, 465, true).translate(0, 0, 232.5).scale(scale).color(birch));
p.part("front-panel", box(285, 12, 440, true).translate(0, -156, 232).scale(scale).color(rosewood));
p.part("top-seat", box(318, 308, 18, true).translate(0, 0, 465).scale(scale).color(birch));
p.part("foot-left", box(48, 45, 14, true).translate(-108, 0, 7).scale(scale).color(rubber));
p.part("foot-right", box(48, 45, 14, true).translate(108, 0, 7).scale(scale).color(rubber));

return p.model();
