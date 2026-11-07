meta({
  "name": "walker-frame",
  "license": "CC0-1.0",
  "title": "Walker frame",
  "description": "Lightweight walking frame with twin hand grips, four legs and front glides for a clinic or recovery scene. Material controls: Anodized aluminum, Silicone hand grips, Rubber floor glides.",
  "tags": [
    "walker frame",
    "walker",
    "walking frame",
    "mobility aid",
    "clinic",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "prop",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 400
});

// A folding walker has paired aluminum side frames, padded hand grips and rubber floor glides.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const anodizedAluminum = param('anodizedAluminum', '#dce2e4', { label: 'Anodized aluminum' });
const silicone = param('silicone', '#4a8991', { label: 'Silicone hand grips' });
const rubber = param('rubber', '#30383c', { label: 'Rubber floor glides' });
presets({
  clinic: { anodizedAluminum: '#c6d0d2', silicone: '#2d9893', rubber: '#4c595b' },
  emergency: { anodizedAluminum: '#c4c1bb', silicone: '#c9413b', rubber: '#504a47' },
});
const p = assembly('walker-frame');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

for (const side of [-1, 1]) {
  p.part('side-rail-' + side, b(0, side * 195, 705, 28, 22, 570).color(anodizedAluminum).scale(overallScale));
  p.part('rear-leg-' + side, b(-230, side * 195, 350, 24, 22, 700).color(anodizedAluminum).scale(overallScale));
  p.part('front-leg-' + side, b(230, side * 195, 350, 24, 22, 700).color(anodizedAluminum).scale(overallScale));
  p.part('grip-' + side, b(0, side * 195, 1010, 180, 42, 24).color(silicone).scale(overallScale));
  p.part('glide-' + side, c(230, side * 195, 0, 24, 18, 8).color(rubber).scale(overallScale));
}
p.part('top-bar', b(0, 0, 990, 430, 22, 22).color(anodizedAluminum).scale(overallScale));

return p.model();
