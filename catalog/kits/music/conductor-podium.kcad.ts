meta({
  "name": "conductor-podium",
  "license": "CC0-1.0",
  "title": "Conductor podium",
  "description": "Small raised conductor podium with broad top, stepped riser and front access step.",
  "tags": [
    "conductor podium",
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
const color = param('color', "#92734f", { label: 'Asset color' });
const p = assembly("conductor-podium");
p.part("platform", box(420, 320, 120, true).translate(0, 0, 60).scale(scale).color(color));
p.part("upper-deck", box(410, 310, 16, true).translate(0, 0, 128).scale(scale).color(color));
p.part("front-step", box(240, 92, 48, true).translate(0, -202, 24).scale(scale).color(color));
p.part("back-rail", box(390, 15, 32, true).translate(0, 148, 144).scale(scale).color(color));

return p.model();
