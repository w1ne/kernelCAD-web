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
const ring = (r: number) => {
  let profile = path().moveTo(r, 0);
  for (let i = 1; i < 10; i++) profile = profile.lineTo(r * Math.cos(2 * Math.PI * i / 10), r * Math.sin(2 * Math.PI * i / 10));
  return profile.close();
};
const p = assembly('shuttlecock');
p.part('cork', sphere(19).translate(0, 0, 19).scale(scale).color(cork));
p.part('skirt', ring(12).loft(ring(45), { spacing: 66, ruled: true }).translate(0, 0, 32).scale(scale).color(featherNylon));
p.part('crown', cylinder(8, 46, 10).translate(0, 0, 92).scale(scale).color(crownTape));

return p.model();
