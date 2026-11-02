meta({
  name: 'kettlebell',
  license: 'CC0-1.0',
  title: 'Kettlebell',
  description: 'Low-poly kettlebell with a rounded body and raised ring handle.',
  tags: ['kettlebell', 'free weights', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#555e63', { label: 'Asset color' });
const p = assembly('kettlebell');
p.part('body', sphere(48).scale([1, 1, 0.92]).translate(0, 0, 44.16).scale(scale).color(color));
p.part('handle', cylinder(10, 34, 12).subtract(cylinder(12, 23, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 0, 104).scale(scale).color(color));
p.part('handle-foot-left', sphere(13).translate(-24, 0, 84).scale(scale).color(color));
p.part('handle-foot-right', sphere(13).translate(24, 0, 84).scale(scale).color(color));

return p.model();
