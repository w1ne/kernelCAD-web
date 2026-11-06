// Distinctive silhouette: Coiled French horn prop with a flared bell, circular tubing loop and rotary valve block. Material controls: lacquered brass, nickel slides, ebonite mouthpiece; concert and vintage presets.
meta({
  "name": "french-horn",
  "license": "CC0-1.0",
  "title": "French horn",
  "description": "Coiled French horn prop with a flared bell, circular tubing loop and rotary valve block.",
  "tags": [
    "french horn",
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
const brass = param('brass', '#c18c35', { label: 'Lacquered brass' });
const nickel = param('nickel', '#bdc7cc', { label: 'Nickel slides' });
const ebonite = param('ebonite', '#28292c', { label: 'Ebonite mouthpiece' });

presets({
  concert: { brass: '#e3b54b' },
  vintage: { brass: '#a86f2d' },
});
const p = assembly("french-horn");
p.part("outer-loop", cylinder(20, 106, 12).subtract(cylinder(22, 84, 12).translate(0, 0, -1)).translate(0, 0, 25).scale(scale).color(brass));
p.part("inner-loop", cylinder(18, 72, 12).subtract(cylinder(20, 56, 12).translate(0, 0, -1)).translate(0, 0, 36).scale(scale).color(brass));
p.part("bell", sphere(54).scale([1, 1, 0.42]).translate(98, 0, 66).scale(scale).color(brass));
p.part("valve-block", box(58, 28, 52, true).translate(0, 0, 83).scale(scale).color(nickel));
p.part("valve-one", cylinder(40, 8, 8).translate(-18, 0, 112).scale(scale).color(nickel));
p.part("valve-two", cylinder(40, 8, 8).translate(0, 0, 112).scale(scale).color(nickel));
p.part("valve-three", cylinder(40, 8, 8).translate(18, 0, 112).scale(scale).color(nickel));
p.part("mouthpiece", cylinder(26, 8, 8).translate(-40, 0, 0).scale(scale).color(ebonite));

return p.model();
