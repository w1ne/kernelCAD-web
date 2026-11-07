// Cricket Bat: Low-poly cricket bat with a wide flat blade, shoulders and slim handle. Low-poly sports prop in millimetres, Z up; materials: willow bat wood, rubber grip, edge tape.
meta({
  name: 'cricket-bat',
  license: 'CC0-1.0',
  title: 'Cricket bat',
  description: "Low-poly cricket bat with a wide flat blade, shoulders and slim handle. Material controls: willow bat wood, rubber grip, edge tape.",
  tags: ['cricket bat', 'bat', 'cricket', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const willowWood = param('willowWood', '#9a754d', { label: 'Willow bat wood' });
const rubberGrip = param('rubberGrip', '#303638', { label: 'Rubber grip' });
const edgeTape = param('edgeTape', '#e6e1d4', { label: 'Edge tape' });
presets({ clubColors: { willowWood: '#bc985d', rubberGrip: '#d04d40' } });
const p = assembly('cricket-bat');
p.part('blade', box(82, 28, 190, true).translate(0, 0, 95).scale(scale).color(willowWood));
p.part('shoulder', box(42, 24, 45, true).translate(0, 0, 203).scale(scale).color(willowWood));
p.part('handle', cylinder(145, 12, 10).translate(0, 0, 225).scale(scale).color(willowWood));
p.part('grip-cap', cylinder(8, 16, 10).translate(0, 0, 370).scale(scale).color(rubberGrip));


// Narrow protective edge strips run along the blade shoulders.
p.part("left-edge-tape", box(2.2, 4, 168, true).translate(-40, -16, 100).color(edgeTape));
p.part("right-edge-tape", box(2.2, 4, 168, true).translate(40, -16, 100).color(edgeTape));

return p.model();
