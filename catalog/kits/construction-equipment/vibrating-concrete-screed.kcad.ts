// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly vibrating concrete screed scene prop, modeled from scratch.
meta({
  name: "vibrating-concrete-screed",
  license: 'CC0-1.0',
  title: "Vibrating concrete screed",
  description: "Finishing beam with engine housing, end handles and a straight leveling blade. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('vibrating-concrete-screed');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('screed-beam', box(70, 1550, 110, true).translate(0, 0, 55), body);
add('vibrator-housing', box(190, 210, 150, true).translate(0, 0, 185), accent);
add('handle-left', box(302.4, 38, 38, true).translate(-168, -558, 224), accent);
add('handle-right', box(302.4, 38, 38, true).translate(-168, 558, 224), accent);
add('eccentric-weight', cylinder(80, 58, 8).translate(0, 0, 310), body);

return p.model();
