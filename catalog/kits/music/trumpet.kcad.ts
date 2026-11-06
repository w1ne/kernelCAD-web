// Distinctive silhouette: Low-poly trumpet with a bell flare, three valve buttons and a straight lead pipe. Material controls: lacquered brass, nickel valve casing, ebonite valve buttons; concert and vintage presets.
meta({
  "name": "trumpet",
  "license": "CC0-1.0",
  "title": "Trumpet",
  "description": "Low-poly trumpet with a bell flare, three valve buttons and a straight lead pipe.",
  "tags": [
    "trumpet",
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
const brass = param('brass', '#c18b34', { label: 'Lacquered brass' });
const nickel = param('nickel', '#aeb9bf', { label: 'Nickel valve casing' });
const ebonite = param('ebonite', '#292a2c', { label: 'Ebonite valve buttons' });

presets({
  concert: { brass: '#e2b44a' },
  vintage: { brass: '#a66d2c' },
});
const p = assembly("trumpet");
p.part("main-pipe", cylinder(250, 13, 10).rotate([1, 0, 0], 90).translate(0, 0, 20).scale(scale).color(brass));
p.part("bell", sphere(48).scale([1, 1, 0.42]).translate(118, 0, 20.16).scale(scale).color(brass));
p.part("valve-one", cylinder(58, 9, 8).translate(-18, 0, 20).scale(scale).color(nickel));
p.part("valve-two", cylinder(58, 9, 8).translate(4, 0, 20).scale(scale).color(nickel));
p.part("valve-three", cylinder(58, 9, 8).translate(26, 0, 20).scale(scale).color(nickel));
p.part("valve-caps", box(72, 18, 6, true).translate(4, 0, 80).scale(scale).color(ebonite));
p.part("mouthpiece", cylinder(35, 8, 8).rotate([1, 0, 0], 90).translate(-136, 0, 20).scale(scale).color(nickel));

return p.model();
