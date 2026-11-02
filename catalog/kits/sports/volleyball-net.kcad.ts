meta({
  name: 'volleyball-net',
  license: 'CC0-1.0',
  title: 'Volleyball net',
  description: 'Portable volleyball net with posts, a broad mesh panel and ground feet.',
  tags: ['volleyball net', 'net', 'volleyball', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#697573', { label: 'Asset color' });
const p = assembly('volleyball-net');
p.part('left-post', cylinder(205, 8, 10).translate(-185, 0, 0).scale(scale).color(color));
p.part('right-post', cylinder(205, 8, 10).translate(185, 0, 0).scale(scale).color(color));
p.part('net-panel', box(358, 8, 180, true).translate(0, 0, 105).scale(scale).color(color));
p.part('top-band', box(370, 14, 12, true).translate(0, 0, 200).scale(scale).color(color));
p.part('base-left', box(90, 36, 10, true).translate(-185, 0, 5).scale(scale).color(color));
p.part('base-right', box(90, 36, 10, true).translate(185, 0, 5).scale(scale).color(color));

return p.model();
