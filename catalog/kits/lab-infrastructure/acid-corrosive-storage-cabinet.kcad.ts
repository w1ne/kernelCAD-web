// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly acid and corrosive storage cabinet scene prop, modeled from scratch.
meta({
  name: 'acid-corrosive-storage-cabinet',
  license: 'CC0-1.0',
  title: 'Acid and corrosive storage cabinet',
  description: 'Low corrosive-storage cabinet with a raised spill lip, paired doors and hazard-color plinth. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('acid-corrosive-storage-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(700, 550, 780, true).translate(0, 0, 390), body);
add('cabinet-plinth', box(644, 495, 22, true).translate(0, 0, 11), accent);
add('door-0', box(288.96, 18, 750, true).translate(-154, -280.5, 765), accent);
add('door-pull-0', box(14, 14, 124.8, true).translate(-57.68, -302.5, 468), accent);
add('door-1', box(288.96, 18, 750, true).translate(154, -280.5, 765), accent);
add('door-pull-1', box(14, 14, 124.8, true).translate(250.32, -302.5, 468), accent);
add('warning-band', box(644, 12, 50, true).translate(0, -291.5, 703.6), accent);

return p.model();
