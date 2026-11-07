meta({
  name: 'starting-block',
  license: 'CC0-1.0',
  title: 'Track starting block',
  description: 'Track starting block prop with a low base rail and two angled-looking foot pads.',
  tags: ['starting block', 'track', 'athletics', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#5d6d79', { label: 'Asset color' });
const p = assembly('starting-block');
p.part('base-rail', box(255, 62, 14, true).translate(0, 0, 7).scale(scale).color(color));
p.part('front-pedal', box(65, 64, 44, true).translate(-72, 0, 36).scale(scale).color(color));
p.part('rear-pedal', box(65, 64, 58, true).translate(70, 0, 43).scale(scale).color(color));
p.part('front-heel-stop', box(12, 64, 50, true).translate(-110, 0, 53).scale(scale).color(color));
p.part('rear-heel-stop', box(12, 64, 66, true).translate(107, 0, 62).scale(scale).color(color));

return p.model();
