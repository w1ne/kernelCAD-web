// Dumbbell: Compact low-poly dumbbell with a horizontal handle and weighted ends. Low-poly sports prop in millimetres, Z up; materials: knurled handle steel, rubber weights.
meta({
  name: 'dumbbell',
  license: 'CC0-1.0',
  title: 'Dumbbell',
  description: "Compact low-poly dumbbell with a horizontal handle and weighted ends. Material controls: knurled handle steel, rubber weights.",
  tags: ['dumbbell', 'free weights', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const knurledSteel = param('knurledSteel', '#aab4b8', { label: 'Knurled handle steel' });
const rubberWeight = param('rubberWeight', '#30363a', { label: 'Rubber weights' });
presets({ clubColors: { knurledSteel: '#aab4b8', rubberWeight: '#496f83' } });
const p = assembly('dumbbell');
p.part('handle', box(115, 18, 18, true).translate(0, 0, 40).scale(scale).color(knurledSteel));
p.part('left-weight', sphere(40).scale([0.68, 1, 1]).translate(-76, 0, 40).scale(scale).color(rubberWeight));
p.part('right-weight', sphere(40).scale([0.68, 1, 1]).translate(76, 0, 40).scale(scale).color(rubberWeight));

return p.model();
