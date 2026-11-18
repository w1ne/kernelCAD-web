// Distinctive silhouette: Small raised conductor podium with broad top, stepped riser and front access step. Material controls: oak platform, enamel riser, rubber tread; concert and vintage presets.
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
const oak = param('oak', '#93603b', { label: 'Oak platform' });
const paint = param('paint', '#334d5e', { label: 'Enamel riser' });
const rubber = param('rubber', '#272b2e', { label: 'Rubber tread' });

presets({
  concert: { oak: '#b57a48' },
  vintage: { oak: '#68452f' },
});
const p = assembly("conductor-podium");
p.part("platform", box(420, 320, 120, true).translate(0, 0, 60).scale(scale).color(oak));
p.part("upper-deck", box(410, 310, 16, true).translate(0, 0, 128).scale(scale).color(oak));
p.part("front-step", box(240, 92, 48, true).translate(0, -202, 24).scale(scale).color(rubber));
p.part("back-rail", box(390, 15, 32, true).translate(0, 148, 144).scale(scale).color(paint));

return p.model();
