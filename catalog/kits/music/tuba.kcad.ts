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
p.part("main-bell", path().circle(0, 0, 24, 12).loft(path().circle(0, 0, 83, 12), { spacing: 90, ruled: true }).translate(0, 0, 155).scale(scale).color(brass));
p.part("bell-neck", cylinder(150, 24, 10).translate(0, 0, 145).scale(scale).color(brass));
p.part("lower-loop", cylinder(20, 92, 12).subtract(cylinder(22, 66, 12).translate(0, 0, -1)).translate(0, 0, 0).scale(scale).color(brass));
p.part("body", sphere(86).scale([0.78, 0.6, 0.78]).translate(50, 0, 95).scale(scale).color(brass));
p.part("valve-one", cylinder(55, 9, 8).translate(15, -26, 62).scale(scale).color(nickel));
p.part("valve-two", cylinder(55, 9, 8).translate(40, -26, 62).scale(scale).color(nickel));
p.part("valve-three", cylinder(55, 9, 8).translate(65, -26, 62).scale(scale).color(nickel));
p.part("valve-button-one", cylinder(6, 9, 8).translate(15, -26, 117).scale(scale).color(ebonite));
p.part("valve-button-two", cylinder(6, 9, 8).translate(40, -26, 117).scale(scale).color(ebonite));
p.part("valve-button-three", cylinder(6, 9, 8).translate(65, -26, 117).scale(scale).color(ebonite));

return p.model();
