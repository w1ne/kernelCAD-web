// Shuttlecock: Low-poly badminton shuttlecock with a rounded cork tip and flared skirt. Low-poly sports prop in millimetres, Z up; materials: cork tip, skirt nylon, crown binding tape.
meta({
  name: 'shuttlecock',
  license: 'CC0-1.0',
  title: 'Shuttlecock',
  description: "Low-poly badminton shuttlecock with a rounded cork tip and flared skirt. Material controls: cork tip, skirt nylon, crown binding tape.",
  tags: ['shuttlecock', 'badminton', 'birdie', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const cork = param('cork', '#b6945d', { label: 'Cork tip' });
const featherNylon = param('featherNylon', '#e8e4d8', { label: 'Skirt nylon' });
const crownTape = param('crownTape', '#d9b94a', { label: 'Crown binding tape' });
presets({ clubColors: { cork: '#b6945d', featherNylon: '#d9e7e5' } });
const p = assembly('shuttlecock');
p.part('cork', sphere(19).translate(0, 0, 19).scale(scale).color(cork));
p.part('skirt', sphere(43).scale([0.9, 0.9, 0.55]).translate(0, 0, 63).scale(scale).color(featherNylon));
p.part('crown', cylinder(8, 39, 10).translate(0, 0, 91).scale(scale).color(crownTape));

return p.model();
