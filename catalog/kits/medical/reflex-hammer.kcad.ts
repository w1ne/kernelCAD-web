meta({
  "name": "reflex-hammer",
  "license": "CC0-1.0",
  "title": "Reflex hammer",
  "description": "Compact neurological reflex hammer with long handle and soft double-ended head for examination scenes. Material controls: Anodized-aluminum handle, Stainless-steel head, Silicone percussion tips.",
  "tags": [
    "reflex hammer",
    "neurological exam",
    "doctor tool",
    "medical instrument",
    "low poly",
    "medical prop"
  ],
  "kit": "medical",
  "category": "item",
  "origin": "base",
  "compat": [
    "medical",
    "clinic",
    "healthcare",
    "indoor"
  ],
  "triangleBudget": 220
});

// A reflex hammer combines a metal crosshead, slender handle and two rubber percussion tips.
const overallScale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const anodizedAluminum = param('anodizedAluminum', '#a7b0b3', { label: 'Anodized-aluminum handle' });
const stainlessSteel = param('stainlessSteel', '#596a70', { label: 'Stainless-steel head' });
const siliconeRubber = param('siliconeRubber', '#37494f', { label: 'Silicone percussion tips' });
presets({
  clinic: { anodizedAluminum: '#b9c2c4', stainlessSteel: '#718186', siliconeRubber: '#546b6d' },
  emergency: { anodizedAluminum: '#b7b0a8', stainlessSteel: '#73716d', siliconeRubber: '#c9413b' },
});
const p = assembly('reflex-hammer');
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);
const c = (x: number, y: number, z: number, h: number, r: number, segments = 10) => cylinder(h, r, segments).translate(x, y, z);

p.part('handle', c(0, 0, 0, 145, 9, 8).color(anodizedAluminum).scale(overallScale));
p.part('head-bar', b(0, 0, 152, 86, 20, 20).color(stainlessSteel).scale(overallScale));
p.part('tip-left', c(-42, 0, 152, 18, 14, 8).color(siliconeRubber).scale(overallScale));
p.part('tip-right', c(42, 0, 152, 18, 14, 8).color(siliconeRubber).scale(overallScale));
p.part('collar', c(0, 0, 138, 8, 14, 8).color(stainlessSteel).scale(overallScale));

return p.model();
