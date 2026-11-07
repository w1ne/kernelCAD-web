// Hockey Puck: Dense cylindrical hockey puck with a molded rubber sidewall and inset dark face band. Low-poly sports prop in millimetres, Z up; materials: vulcanized puck rubber, face rubber.
meta({
  name: 'hockey-puck',
  license: 'CC0-1.0',
  title: 'Hockey puck',
  description: "Dense cylindrical hockey puck with a molded rubber sidewall and inset dark face band. Material controls: vulcanized puck rubber, face rubber.",
  tags: ['hockey puck', 'puck', 'ice hockey', 'indoor sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const vulcanizedRubber = param('vulcanizedRubber', '#383d42', { label: 'Vulcanized puck rubber' });
const faceRubber = param('faceRubber', '#252a2e', { label: 'Face rubber' });
presets({ clubColors: { vulcanizedRubber: '#3b6682', faceRubber: '#252a2e' } });
const p = assembly('hockey-puck');
p.part('puck', cylinder(24, 38, 12).scale(scale).color(vulcanizedRubber));


// A shallow face ring gives the molded rubber puck a distinct top surface.
p.part("face-inset-ring", cylinder(2, 29, 12).subtract(cylinder(3, 22, 12).translate(0, 0, -0.5)).translate(0, 0, 22).color(faceRubber));

return p.model();
