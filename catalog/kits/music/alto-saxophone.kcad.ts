// Distinctive silhouette: Saxophone with bent neck, broad bell and raised pearl-like key buttons. Material controls: lacquered brass, nickel keywork, ebonite mouthpiece; concert and vintage presets.
meta({
  "name": "alto-saxophone",
  "license": "CC0-1.0",
  "title": "Alto saxophone",
  "description": "Saxophone with bent neck, broad bell and raised pearl-like key buttons.",
  "tags": [
    "alto saxophone",
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
const brass = param('brass', '#c08a32', { label: 'Lacquered brass' });
const nickel = param('nickel', '#c1c9ce', { label: 'Nickel keywork' });
const ebonite = param('ebonite', '#292830', { label: 'Ebonite mouthpiece' });

presets({
  concert: { brass: '#e2b346' },
  vintage: { brass: '#a76d2d' },
});
const p = assembly("alto-saxophone");
p.part("body", cylinder(300, 28, 10).translate(0, 0, 42).scale(scale).color(brass));
p.part("lower-body", sphere(50).scale([0.7, 0.72, 1.2]).translate(24, 0, 60).scale(scale).color(brass));
p.part("bell", path().circle(0, 0, 58, 12).loft(path().circle(0, 0, 18, 12), { spacing: 82, ruled: true }).translate(24, 0, 0).scale(scale).color(brass));
p.part("crook", path().moveTo(8, 328).lineTo(-18, 328).lineTo(-58, 350).lineTo(-58, 386).lineTo(-44, 386).lineTo(-44, 357).lineTo(-12, 342).lineTo(8, 342).close().extrude(14).rotateX(90).translate(0, 7, 0).scale(scale).color(brass));
p.part("mouthpiece", box(18, 18, 34, true).rotateZ(-8).translate(-51, -8, 403).scale(scale).color(ebonite));
p.part("key-rail", box(13, 20, 196, true).translate(-34, -22, 205).scale(scale).color(nickel));
p.part("keys", box(18, 10, 12, true).translate(-24, -30, 145).scale(scale).color(nickel));
p.part("keys-upper", box(18, 10, 12, true).translate(-24, -30, 193).scale(scale).color(nickel));
p.part("keys-top", box(18, 10, 12, true).translate(-24, -30, 241).scale(scale).color(nickel));

return p.model();
