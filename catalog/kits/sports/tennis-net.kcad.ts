meta({
  name: 'tennis-net',
  license: 'CC0-1.0',
  title: 'Tennis net',
  description: 'Practice tennis net with upright posts and a simplified rectangular mesh panel.',
  tags: ['tennis net', 'net', 'tennis court', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#6d7471', { label: 'Asset color' });
const p = assembly('tennis-net');
p.part('left-post', cylinder(145, 7, 10).translate(-220, 0, 0).scale(scale).color(color));
p.part('right-post', cylinder(145, 7, 10).translate(220, 0, 0).scale(scale).color(color));
p.part('net-panel', box(430, 7, 116, true).translate(0, 0, 85).scale(scale).color(color));
p.part('top-band', box(445, 12, 12, true).translate(0, 0, 145).scale(scale).color(color));
p.part('base-left', box(72, 32, 8, true).translate(-220, 0, 4).scale(scale).color(color));
p.part('base-right', box(72, 32, 8, true).translate(220, 0, 4).scale(scale).color(color));

return p.model();
