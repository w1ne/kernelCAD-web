// Golf Club: Low-poly golf club with a metal head, long shaft and top grip. Low-poly sports prop in millimetres, Z up; materials: club-head stainless steel, graphite shaft, grip rubber.
meta({
  name: 'golf-club',
  license: 'CC0-1.0',
  title: 'Golf club',
  description: "Low-poly golf club with a metal head, long shaft and top grip. Material controls: club-head stainless steel, graphite shaft, grip rubber.",
  tags: ['golf club', 'golf', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#abb6b9', { label: 'Club-head stainless steel' });
const graphiteShaft = param('graphiteShaft', '#3c444a', { label: 'Graphite shaft' });
const gripRubber = param('gripRubber', '#242d32', { label: 'Grip rubber' });
presets({ clubColors: { stainlessSteel: '#abb6b9', graphiteShaft: '#3c444a' } });
const p = assembly('golf-club');
p.part('club-head', box(118, 44, 28, true).translate(30, 0, 14).scale(scale).color(stainlessSteel));
p.part('shaft', cylinder(660, 7, 8).translate(4, 0, 28).scale(scale).color(graphiteShaft));
p.part('grip', cylinder(105, 12, 8).translate(4, 0, 590).scale(scale).color(gripRubber));

return p.model();
