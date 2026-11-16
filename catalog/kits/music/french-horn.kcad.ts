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
const C = 106;
const ring = (h: number, ro: number, ri: number) => cylinder(h, ro, 12).subtract(cylinder(h + 2, ri, 12).translate(0, 0, -1)).rotate([1, 0, 0], -90).translate(0, -h / 2, C);
const tx = (len: number, r: number, x0: number, z: number) => cylinder(len, r, 10).rotate([0, 1, 0], 90).translate(x0, 0, z);
p.part("outer-loop", ring(20, 106, 84).scale(scale).color(brass));
p.part("inner-loop", ring(18, 88, 62).scale(scale).color(brass));
p.part("bell-pipe", tx(50, 12, 90, C).scale(scale).color(brass));
p.part("bell-flare-a", tx(35, 22, 140, C).scale(scale).color(brass));
p.part("bell-flare-b", tx(35, 34, 175, C).scale(scale).color(brass));
p.part("bell-flare-c", tx(30, 50, 210, C).scale(scale).color(brass));
p.part("valve-block", box(58, 28, 44, true).translate(0, 0, 200).scale(scale).color(nickel));
p.part("valve-one", cylinder(30, 8, 8).translate(-18, 0, 220).scale(scale).color(nickel));
p.part("valve-two", cylinder(30, 8, 8).translate(0, 0, 220).scale(scale).color(nickel));
p.part("valve-three", cylinder(30, 8, 8).translate(18, 0, 220).scale(scale).color(nickel));
p.part("mouthpiece", tx(46, 8, -75, 200).scale(scale).color(ebonite));

return p.model();
