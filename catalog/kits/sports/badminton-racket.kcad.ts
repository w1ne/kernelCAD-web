// Badminton Racket: Lightweight low-poly badminton racket with a slim shaft and oval head. Low-poly sports prop in millimetres, Z up; materials: graphite frame, nylon strings, grip rubber.
meta({
  name: 'badminton-racket',
  license: 'CC0-1.0',
  title: 'Badminton racket',
  description: "Lightweight low-poly badminton racket with a slim shaft and oval head. Material controls: graphite frame, nylon strings, grip rubber.",
  tags: ['badminton racket', 'racket', 'badminton', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const graphiteFrame = param('graphiteFrame', '#596d62', { label: 'Graphite frame' });
const nylonStrings = param('nylonStrings', '#e8e4d8', { label: 'Nylon strings' });
const gripRubber = param('gripRubber', '#343a38', { label: 'Grip rubber' });
presets({ clubColors: { graphiteFrame: '#2d536f', nylonStrings: '#e8e4d8' } });
const p = assembly('badminton-racket');
p.part('head-frame', sphere(76).scale([0.62, 0.1, 1]).subtract(sphere(63).scale([0.6, 0.25, 1.1])).translate(0, 0, 108).scale(scale).color(graphiteFrame));
p.part('throat', box(14, 12, 45, true).translate(0, 0, 58).scale(scale).color(graphiteFrame));
p.part('shaft', cylinder(86, 7, 8).scale(scale).color(graphiteFrame));
p.part('grip', cylinder(84, 10, 8).translate(0, 0, 0).scale(scale).color(gripRubber));
p.part('string-vertical-left', box(3, 3, 110, true).translate(-16, 0, 108).scale(scale).color(nylonStrings));
p.part('string-vertical-centre', box(3, 3, 110, true).translate(0, 0, 108).scale(scale).color(nylonStrings));
p.part('string-vertical-right', box(3, 3, 110, true).translate(16, 0, 108).scale(scale).color(nylonStrings));
p.part('string-horizontal-1', box(54, 3, 3, true).translate(0, 0, 75).scale(scale).color(nylonStrings));
p.part('string-horizontal-2', box(54, 3, 3, true).translate(0, 0, 95).scale(scale).color(nylonStrings));
p.part('string-horizontal-3', box(54, 3, 3, true).translate(0, 0, 115).scale(scale).color(nylonStrings));
p.part('string-horizontal-4', box(54, 3, 3, true).translate(0, 0, 135).scale(scale).color(nylonStrings));

return p.model();
