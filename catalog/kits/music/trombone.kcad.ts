// Distinctive silhouette: Trombone with a wide bell, long slide tubes and a cross brace. Material controls: lacquered brass bell, nickel slide tubes, ebonite mouthpiece; concert and vintage presets.
meta({
  "name": "trombone",
  "license": "CC0-1.0",
  "title": "Trombone",
  "description": "Trombone with a wide bell, long slide tubes and a cross brace.",
  "tags": [
    "trombone",
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
const brass = param('brass', '#c18b34', { label: 'Lacquered brass bell' });
const nickel = param('nickel', '#bbc5ca', { label: 'Nickel slide tubes' });
const ebonite = param('ebonite', '#292a2d', { label: 'Ebonite mouthpiece' });

presets({
  concert: { brass: '#e1b144' },
  vintage: { brass: '#a56c2b' },
});
const p = assembly("trombone");
p.part("bell", sphere(58).scale([1, 1, 0.38]).translate(130, 0, 58).scale(scale).color(brass));
p.part("bell-pipe", cylinder(100, 14, 10).rotate([1, 0, 0], 90).translate(46, 0, 58).scale(scale).color(brass));
p.part("inner-slide-left", cylinder(310, 7, 8).translate(-42, -10, 16).scale(scale).color(nickel));
p.part("inner-slide-right", cylinder(310, 7, 8).translate(-4, -10, 16).scale(scale).color(nickel));
p.part("outer-slide-left", cylinder(322, 5, 8).translate(-48, 10, 0).scale(scale).color(nickel));
p.part("outer-slide-right", cylinder(322, 5, 8).translate(2, 10, 0).scale(scale).color(nickel));
p.part("slide-crossbar", box(74, 22, 14, true).translate(-23, 0, 28).scale(scale).color(nickel));
p.part("mouthpiece", cylinder(25, 8, 8).translate(-54, 0, 310).scale(scale).color(ebonite));

return p.model();
