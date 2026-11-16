// Distinctive silhouette: Pair of thin orchestral crash cymbals with central bosses and short grips. Material controls: b20 bronze, leather hand straps, steel bosses; concert and vintage presets.
meta({
  "name": "orchestral-cymbals",
  "license": "CC0-1.0",
  "title": "Orchestral cymbals",
  "description": "Pair of thin orchestral crash cymbals with central bosses and short grips.",
  "tags": [
    "orchestral cymbals",
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
const bronze = param('bronze', '#c18d34', { label: 'B20 bronze' });
const leather = param('leather', '#57392b', { label: 'Leather hand straps' });
const steel = param('steel', '#9da9ae', { label: 'Steel bosses' });

presets({
  concert: { bronze: '#e1b44b' },
  vintage: { bronze: '#a66b2f' },
});
const p = assembly("orchestral-cymbals");
const R = 79;
const cym = (x: number) => sphere(R).scale([0.12, 1, 1]).translate(x, 0, R);
const grip = (x0: number) => cylinder(42, 7, 8).rotate([0, 1, 0], 90).translate(x0, 0, R);
p.part("upper-cymbal", cym(-8).scale(scale).color(bronze));
p.part("lower-cymbal", cym(8).scale(scale).color(bronze));
p.part("upper-boss", sphere(18).translate(-14, 0, R).scale(scale).color(steel));
p.part("lower-boss", sphere(18).translate(14, 0, R).scale(scale).color(steel));
p.part("upper-grip", grip(-58).scale(scale).color(leather));
p.part("lower-grip", grip(16).scale(scale).color(leather));

return p.model();
