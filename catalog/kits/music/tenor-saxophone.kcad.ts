// Distinctive silhouette: Larger tenor saxophone with a curved neck, broad bell and raised keywork. Material controls: lacquered brass, nickel keywork, ebonite mouthpiece; concert and vintage presets.
meta({
  "name": "tenor-saxophone",
  "license": "CC0-1.0",
  "title": "Tenor saxophone",
  "description": "Larger tenor saxophone with a curved neck, broad bell and raised keywork.",
  "tags": [
    "tenor saxophone",
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
const brass = param('brass', '#bb842e', { label: 'Lacquered brass' });
const nickel = param('nickel', '#bdc7cc', { label: 'Nickel keywork' });
const ebonite = param('ebonite', '#29292b', { label: 'Ebonite mouthpiece' });

presets({
  concert: { brass: '#dfae3f' },
  vintage: { brass: '#a2692a' },
});
const p = assembly("tenor-saxophone");
p.part("body", cylinder(365, 32, 10).translate(0, 0, 42).scale(scale).color(brass));
p.part("lower-body", sphere(56).scale([0.7, 0.72, 1.25]).translate(30, 0, 70).scale(scale).color(brass));
p.part("bell", path().circle(0, 0, 66, 12).loft(path().circle(0, 0, 20, 12), { spacing: 94, ruled: true }).translate(30, 0, 0).scale(scale).color(brass));
p.part("crook", path().moveTo(9, 396).lineTo(-22, 396).lineTo(-68, 421).lineTo(-68, 460).lineTo(-53, 460).lineTo(-53, 429).lineTo(-13, 411).lineTo(9, 411).close().extrude(16).rotateX(90).translate(0, 8, 0).scale(scale).color(brass));
p.part("mouthpiece", box(18, 18, 36, true).rotateZ(-8).translate(-61, -9, 478).scale(scale).color(ebonite));
p.part("key-rail", box(14, 22, 236, true).translate(-39, -27, 242).scale(scale).color(nickel));
p.part("keys-low", box(20, 12, 13, true).translate(-28, -37, 156).scale(scale).color(nickel));
p.part("keys-mid", box(20, 12, 13, true).translate(-28, -37, 220).scale(scale).color(nickel));
p.part("keys-high", box(20, 12, 13, true).translate(-28, -37, 284).scale(scale).color(nickel));

return p.model();
