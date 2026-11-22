// Distinctive silhouette: Straight clarinet with a flared bell, mouthpiece and regularly spaced key pads. Material controls: grenadilla wood, silver keywork, ivory rings; concert and vintage presets.
meta({
  "name": "clarinet",
  "license": "CC0-1.0",
  "title": "Clarinet",
  "description": "Straight clarinet with a flared bell, mouthpiece and regularly spaced key pads.",
  "tags": [
    "clarinet",
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
const grenadilla = param('grenadilla', '#292626', { label: 'Grenadilla wood' });
const silver = param('silver', '#bcc6cb', { label: 'Silver keywork' });
const ivory = param('ivory', '#e5d8b9', { label: 'Ivory rings' });

presets({
  concert: { grenadilla: '#343039' },
  vintage: { grenadilla: '#211d1d' },
});
const p = assembly("clarinet");
p.part("barrel", cylinder(430, 17, 10).translate(0, 0, 0).scale(scale).color(grenadilla));
p.part("bell", sphere(38).scale([1, 1, 0.52]).translate(0, 0, 452).scale(scale).color(grenadilla));
p.part("mouthpiece", box(22, 20, 72, true).translate(0, 0, 537).scale(scale).color(grenadilla));
p.part("ivory-ring-low", cylinder(5, 18, 10).subtract(cylinder(7, 14, 10).translate(0, 0, -1)).translate(0, 0, 46).scale(scale).color(ivory));
p.part("ivory-ring-high", cylinder(5, 18, 10).subtract(cylinder(7, 14, 10).translate(0, 0, -1)).translate(0, 0, 388).scale(scale).color(ivory));
p.part("key-one", sphere(9).translate(-18, -8, 120).scale(scale).color(silver));
p.part("key-two", sphere(9).translate(-18, -8, 174).scale(scale).color(silver));
p.part("key-three", sphere(9).translate(-18, -8, 228).scale(scale).color(silver));
p.part("key-four", sphere(9).translate(-18, -8, 282).scale(scale).color(silver));
p.part("key-five", sphere(9).translate(-18, -8, 336).scale(scale).color(silver));

return p.model();
