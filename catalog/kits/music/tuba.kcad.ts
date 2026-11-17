// Distinctive silhouette: Compact tuba with a large bell, looping body tube and front-facing valve buttons. Material controls: lacquered brass, nickel valve casing, ebonite valve buttons; concert and vintage presets.
meta({
  "name": "tuba",
  "license": "CC0-1.0",
  "title": "Tuba",
  "description": "Compact tuba with a large bell, looping body tube and front-facing valve buttons.",
  "tags": [
    "tuba",
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
const brass = param('brass', '#bd8730', { label: 'Lacquered brass' });
const nickel = param('nickel', '#aeb9bf', { label: 'Nickel valve casing' });
const ebonite = param('ebonite', '#292a2c', { label: 'Ebonite valve buttons' });

presets({
  concert: { brass: '#e2b247' },
  vintage: { brass: '#a2692b' },
});
const p = assembly("tuba");
const C = 92;
const ring = (h: number, ro: number, ri: number) => cylinder(h, ro, 12).subtract(cylinder(h + 2, ri, 12).translate(0, 0, -1)).rotate([1, 0, 0], -90).translate(0, -h / 2, C);
p.part("lower-loop", ring(36, 92, 66).scale(scale).color(brass));
p.part("body", ring(28, 70, 50).scale(scale).color(brass));
p.part("bell-neck", cylinder(80, 22, 10).translate(-50, 0, 138).scale(scale).color(brass));
p.part("main-bell", path().circle(0, 0, 22, 12).loft(path().circle(0, 0, 83, 12), { spacing: 90, ruled: true }).translate(-50, 0, 218).scale(scale).color(brass));
p.part("valve-one", cylinder(50, 9, 8).translate(10, -18, 120).scale(scale).color(nickel));
p.part("valve-two", cylinder(50, 9, 8).translate(32, -18, 120).scale(scale).color(nickel));
p.part("valve-three", cylinder(50, 9, 8).translate(54, -18, 120).scale(scale).color(nickel));
p.part("valve-button-one", cylinder(6, 9, 8).translate(10, -18, 170).scale(scale).color(ebonite));
p.part("valve-button-two", cylinder(6, 9, 8).translate(32, -18, 170).scale(scale).color(ebonite));
p.part("valve-button-three", cylinder(6, 9, 8).translate(54, -18, 170).scale(scale).color(ebonite));

return p.model();
