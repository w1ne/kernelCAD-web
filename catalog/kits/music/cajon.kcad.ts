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
const color = param('color', "#a67545", { label: 'Asset color' });
const p = assembly("cajon");
p.part("body", box(310, 300, 465, true).translate(0, 0, 232.5).scale(scale).color(color));
p.part("front-panel", box(285, 12, 440, true).translate(0, -156, 232).scale(scale).color(color));
p.part("top-seat", box(318, 308, 18, true).translate(0, 0, 465).scale(scale).color(color));
p.part("foot-left", box(48, 45, 14, true).translate(-108, 0, 7).scale(scale).color(color));
p.part("foot-right", box(48, 45, 14, true).translate(108, 0, 7).scale(scale).color(color));

return p.model();
