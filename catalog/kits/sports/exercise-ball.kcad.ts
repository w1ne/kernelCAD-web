// Exercise Ball: Large vinyl fitness ball with raised reinforcing seams and a distinct inflation valve. Low-poly sports prop in millimetres, Z up; materials: exercise ball vinyl, reinforced seam tape, valve polymer.
meta({
  name: 'exercise-ball',
  license: 'CC0-1.0',
  title: 'Exercise ball',
  description: "Large vinyl fitness ball with raised reinforcing seams and a distinct inflation valve. Material controls: exercise ball vinyl, reinforced seam tape, valve polymer.",
  tags: ['exercise ball', 'fitness ball', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vinylCover = param('vinylCover', '#7c9ab2', { label: 'Exercise ball vinyl' });
const seamTape = param('seamTape', '#eee8dc', { label: 'Reinforced seam tape' });
const valvePolymer = param('valvePolymer', '#333b40', { label: 'Valve polymer' });
presets({ clubColors: { vinylCover: '#ce5948', seamTape: '#eee8dc' } });
const p = assembly('exercise-ball');
p.part('ball', sphere(108).translate(0, 0, 108).scale(scale).color(vinylCover));


// A broad reinforcing seam and small inflation valve distinguish the fitness ball.
p.part("reinforced-seam", torus(63.4, 0.7, 12).translate(0, 0, 64).color(seamTape));
p.part("inflation-valve", cylinder(5, 5, 8).translate(0, -61, 60).color(valvePolymer));

return p.model();
