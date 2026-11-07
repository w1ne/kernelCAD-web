// Distinctive silhouette: Bassoon prop with paired long bores, curved bocal and grouped keywork. Material controls: maple body, silver keywork, ebonite reed; concert and vintage presets.
meta({
  "name": "bassoon",
  "license": "CC0-1.0",
  "title": "Bassoon",
  "description": "Bassoon prop with paired long bores, curved bocal and grouped keywork.",
  "tags": [
    "bassoon",
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
const maple = param('maple', '#8c552f', { label: 'Maple body' });
const silver = param('silver', '#b9c5cb', { label: 'Silver keywork' });
const ebonite = param('ebonite', '#27272a', { label: 'Ebonite reed' });

presets({
  concert: { maple: '#a46938' },
  vintage: { maple: '#603d2d' },
});
const p = assembly("bassoon");
p.part("long-joint", cylinder(430, 24, 10).translate(-22, 0, 22).scale(scale).color(maple));
p.part("wing-joint", cylinder(320, 19, 10).translate(22, 0, 22).scale(scale).color(maple));
p.part("boot-joint", box(92, 52, 70, true).translate(0, 0, 35).scale(scale).color(maple));
p.part("bell-joint", sphere(44).scale([1, 1, 0.45]).translate(-22, 0, 457).scale(scale).color(maple));
p.part("bocal", cylinder(78, 9, 8).rotate([1, 0, 0], 90).translate(-22, 0, 499).scale(scale).color(silver));
p.part("reed", box(8, 7, 32, true).rotateZ(-12).translate(-29, -8, 541).scale(scale).color(ebonite));
p.part("key-rail", box(12, 15, 270, true).translate(-52, -22, 195).scale(scale).color(silver));
p.part("key-low", box(18, 9, 14, true).translate(-38, -31, 88).scale(scale).color(silver));
p.part("key-mid", box(18, 9, 14, true).translate(-38, -31, 171).scale(scale).color(silver));
p.part("key-high", box(18, 9, 14, true).translate(-38, -31, 254).scale(scale).color(silver));

return p.model();
