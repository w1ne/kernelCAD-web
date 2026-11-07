// Inline Skate: Low-poly inline skate boot with a cuff, chassis and three aligned wheels. Low-poly sports prop in millimetres, Z up; materials: synthetic boot fabric, frame aluminium, urethane wheels, molded cuff polymer.
meta({
  name: 'inline-skate',
  license: 'CC0-1.0',
  title: 'Inline skate',
  description: "Low-poly inline skate boot with a cuff, chassis and three aligned wheels. Material controls: synthetic boot fabric, frame aluminium, urethane wheels, molded cuff polymer.",
  tags: ['inline skate', 'roller skate', 'skating', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const syntheticBoot = param('syntheticBoot', '#465c70', { label: 'Synthetic boot fabric' });
const aluminiumFrame = param('aluminiumFrame', '#9ea9ac', { label: 'Frame aluminium' });
const urethaneWheel = param('urethaneWheel', '#d6d4ca', { label: 'Urethane wheels' });
const moldedCuff = param('moldedCuff', '#35424d', { label: 'Molded cuff polymer' });
presets({ clubColors: { syntheticBoot: '#c04d40', aluminiumFrame: '#9ea9ac' } });
const p = assembly('inline-skate');
p.part('boot', box(170, 84, 88, true).translate(0, 0, 116).scale(scale).color(syntheticBoot));
p.part('cuff', box(92, 76, 42, true).translate(-28, 0, 174).scale(scale).color(moldedCuff));
p.part('chassis', box(158, 36, 14, true).translate(0, 0, 53).scale(scale).color(aluminiumFrame));
p.part('wheel-front', sphere(23).translate(-54, 0, 23).scale(scale).color(urethaneWheel));
p.part('wheel-middle', sphere(23).translate(0, 0, 23).scale(scale).color(urethaneWheel));
p.part('wheel-rear', sphere(23).translate(54, 0, 23).scale(scale).color(urethaneWheel));

return p.model();
