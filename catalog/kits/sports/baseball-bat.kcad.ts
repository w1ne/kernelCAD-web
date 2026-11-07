// Baseball Bat: Upright low-poly baseball bat with a narrow grip and widened barrel. Low-poly sports prop in millimetres, Z up; materials: maple bat wood, grip tape, end-grain wood.
meta({
  name: 'baseball-bat',
  license: 'CC0-1.0',
  title: 'Baseball bat',
  description: "Upright low-poly baseball bat with a narrow grip and widened barrel. Material controls: maple bat wood, grip tape, end-grain wood.",
  tags: ['baseball bat', 'bat', 'baseball', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const mapleWood = param('mapleWood', '#9b7046', { label: 'Maple bat wood' });
const gripTape = param('gripTape', '#30363a', { label: 'Grip tape' });
const endGrain = param('endGrain', '#c39a64', { label: 'End-grain wood' });
presets({ clubColors: { mapleWood: '#bd8b51', gripTape: '#c5443d' } });
const p = assembly('baseball-bat');
p.part('grip', cylinder(125, 12, 10).scale(scale).color(gripTape));
p.part('taper', cylinder(90, 17, 10).translate(0, 0, 115).scale(scale).color(mapleWood));
p.part('barrel', cylinder(250, 25, 12).translate(0, 0, 195).scale(scale).color(mapleWood));
p.part('knob', cylinder(10, 19, 10).translate(0, 0, 0).scale(scale).color(endGrain));

return p.model();
