// Lacrosse Stick: Lacrosse stick with a long graphite shaft, molded open head and a visible crossed nylon pocket. Low-poly sports prop in millimetres, Z up; materials: graphite shaft, head polymer, pocket nylon.
meta({
  name: 'lacrosse-stick',
  license: 'CC0-1.0',
  title: 'Lacrosse stick',
  description: "Lacrosse stick with a long graphite shaft, molded open head and a visible crossed nylon pocket. Material controls: graphite shaft, head polymer, pocket nylon.",
  tags: ['lacrosse stick', 'stick', 'lacrosse', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const graphiteShaft = param('graphiteShaft', '#59666b', { label: 'Graphite shaft' });
const headPolymer = param('headPolymer', '#e4e1d8', { label: 'Head polymer' });
const pocketNylon = param('pocketNylon', '#d5d2c7', { label: 'Pocket nylon' });
presets({ clubColors: { graphiteShaft: '#3e6b8c', headPolymer: '#d4a02f' } });
const p = assembly('lacrosse-stick');
p.part('shaft', cylinder(580, 9, 10).scale(scale).color(graphiteShaft));
p.part('head', sphere(68).scale([0.72, 1.05, 0.14]).subtract(sphere(53).scale([0.72, 1.05, 0.18])).rotateX(90).translate(0, 0, 618).scale(scale).color(headPolymer));
p.part('throat', box(16, 16, 42, true).translate(0, 0, 580).scale(scale).color(graphiteShaft));


// Crossed nylon cords fill the shallow pocket of the open lacrosse head.
for (let i = 0; i < 7; i++) p.part(`pocket-longitudinal-${i + 1}`, box(2, 2, 78, true).translate(-30 + i * 10, -10, 618).color(pocketNylon));
for (let i = 0; i < 5; i++) p.part(`pocket-cross-${i + 1}`, box(52, 2, 2, true).translate(0, -10, 590 + i * 14).color(pocketNylon));

return p.model();
