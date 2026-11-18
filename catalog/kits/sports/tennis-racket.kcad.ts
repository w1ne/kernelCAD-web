// Tennis Racket: Low-poly tennis racket with an oval head and long handle. Low-poly sports prop in millimetres, Z up; materials: graphite frame, nylon strings, grip tape.
meta({
  name: 'tennis-racket',
  license: 'CC0-1.0',
  title: 'Tennis racket',
  description: "Low-poly tennis racket with an oval head and long handle. Material controls: graphite frame, nylon strings, grip tape.",
  tags: ['tennis racket', 'racket', 'tennis', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const graphiteFrame = param('graphiteFrame', '#5b6870', { label: 'Graphite frame' });
const nylonStrings = param('nylonStrings', '#e7e3d7', { label: 'Nylon strings' });
const gripTape = param('gripTape', '#343a3d', { label: 'Grip tape' });
presets({ clubColors: { graphiteFrame: '#357394', nylonStrings: '#e7e3d7' } });
const p = assembly('tennis-racket');
p.part('head-frame', sphere(89).scale([0.68, 0.12, 1]).subtract(sphere(75).scale([0.67, 0.28, 1.1])).translate(0, 0, 125).scale(scale).color(graphiteFrame));
p.part('throat', box(22, 16, 55, true).translate(0, 0, 77).scale(scale).color(graphiteFrame));
p.part('handle', box(18, 20, 76, true).translate(0, 0, 38).scale(scale).color(gripTape));
p.part('butt-cap', box(24, 26, 8, true).translate(0, 0, 4).scale(scale).color(gripTape));
p.part('string-vertical-left-outer', box(3, 3, 132, true).translate(-24, 0, 125).scale(scale).color(nylonStrings));
p.part('string-vertical-left-inner', box(3, 3, 132, true).translate(-12, 0, 125).scale(scale).color(nylonStrings));
p.part('string-vertical-centre', box(3, 3, 132, true).translate(0, 0, 125).scale(scale).color(nylonStrings));
p.part('string-vertical-right-inner', box(3, 3, 132, true).translate(12, 0, 125).scale(scale).color(nylonStrings));
p.part('string-vertical-right-outer', box(3, 3, 132, true).translate(24, 0, 125).scale(scale).color(nylonStrings));
p.part('string-horizontal-1', box(78, 3, 3, true).translate(0, 0, 91).scale(scale).color(nylonStrings));
p.part('string-horizontal-2', box(78, 3, 3, true).translate(0, 0, 108).scale(scale).color(nylonStrings));
p.part('string-horizontal-3', box(78, 3, 3, true).translate(0, 0, 125).scale(scale).color(nylonStrings));
p.part('string-horizontal-4', box(78, 3, 3, true).translate(0, 0, 142).scale(scale).color(nylonStrings));
p.part('string-horizontal-5', box(78, 3, 3, true).translate(0, 0, 159).scale(scale).color(nylonStrings));

return p.model();
