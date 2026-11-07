meta({
  name: 'exercise-ball',
  license: 'CC0-1.0',
  title: 'Exercise ball',
  description: 'Large low-poly exercise ball for a studio or gym scene.',
  tags: ['exercise ball', 'fitness ball', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#5a9bb1', { label: 'Asset color' });
const p = assembly('exercise-ball');
p.part('ball', sphere(108).translate(0, 0, 108).scale(scale).color(color));

return p.model();
