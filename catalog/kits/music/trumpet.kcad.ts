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
const Z = 48;
const tx = (len: number, r: number, x0: number, y = 0) => cylinder(len, r, 10).rotate([0, 1, 0], 90).translate(x0, y, Z);
p.part("main-pipe", tx(270, 8, -130).scale(scale).color(brass));
p.part("bell-flare-a", tx(30, 12, 130).scale(scale).color(brass));
p.part("bell-flare-b", tx(30, 20, 160).scale(scale).color(brass));
p.part("bell-flare-c", tx(30, 32, 190).scale(scale).color(brass));
p.part("bell-flare-d", tx(30, 48, 220).scale(scale).color(brass));
p.part("valve-one", cylinder(58, 9, 8).translate(-18, 0, Z - 10).scale(scale).color(nickel));
p.part("valve-two", cylinder(58, 9, 8).translate(4, 0, Z - 10).scale(scale).color(nickel));
p.part("valve-three", cylinder(58, 9, 8).translate(26, 0, Z - 10).scale(scale).color(nickel));
p.part("valve-caps", box(72, 18, 6, true).translate(4, 0, Z + 51).scale(scale).color(ebonite));
p.part("mouthpiece", tx(40, 8, -170).scale(scale).color(nickel));

return p.model();
