// Distinctive silhouette: Stepped tapered mechanical metronome with a face scale, pendulum and sliding weight. Material controls: walnut case, brass pendulum, steel slider; concert and vintage presets.
meta({
  "name": "mechanical-metronome",
  "license": "CC0-1.0",
  "title": "Mechanical metronome",
  "description": "Stepped tapered mechanical metronome with a face scale, pendulum and sliding weight.",
  "tags": [
    "mechanical metronome",
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
const walnut = param('walnut', '#71462f', { label: 'Walnut case' });
const brass = param('brass', '#c19137', { label: 'Brass pendulum' });
const steel = param('steel', '#aeb9be', { label: 'Steel slider' });

presets({
  concert: { walnut: '#8b5736' },
  vintage: { walnut: '#50362d' },
});
const p = assembly("mechanical-metronome");
p.part("lower-case", box(150, 100, 175, true).translate(0, 0, 87.5).scale(scale).color(walnut));
p.part("upper-step-one", box(132, 92, 34, true).translate(0, 0, 192).scale(scale).color(walnut));
p.part("upper-step-two", box(104, 82, 34, true).translate(0, 0, 226).scale(scale).color(walnut));
p.part("upper-step-three", box(74, 72, 34, true).translate(0, 0, 260).scale(scale).color(walnut));
p.part("top-cap", sphere(15).translate(0, 0, 281).scale(scale).color(brass));
p.part("pendulum-rod", box(8, 8, 186, true).translate(0, -53, 150).scale(scale).color(steel));
p.part("slider-weight", box(38, 18, 28, true).translate(0, -54, 160).scale(scale).color(steel));
p.part("base", box(170, 110, 20, true).translate(0, 0, 10).scale(scale).color(walnut));

return p.model();
