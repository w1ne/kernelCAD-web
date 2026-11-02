// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly cleanroom gowning locker bank scene prop, modeled from scratch.
meta({
  name: 'cleanroom-gowning-locker-bank',
  license: 'CC0-1.0',
  title: 'Cleanroom gowning locker bank',
  description: 'Four-bay gowning locker lineup with ventilated doors, label strips and a shared plinth. Knobs: overall scale, body color and accent color.',
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
const p = assembly('cleanroom-gowning-locker-bank');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(1200, 520, 1850, true).translate(0, 0, 925), body);
add('cabinet-plinth', box(1104, 468, 22, true).translate(0, 0, 11), accent);
add('door-0', box(247.68, 18, 1820, true).translate(-396, -265.2, 1835), body);
add('door-pull-0', box(14, 14, 296, true).translate(-313.44, -286, 1110), accent);
add('door-1', box(247.68, 18, 1820, true).translate(-132, -265.2, 1835), body);
add('door-pull-1', box(14, 14, 296, true).translate(-49.44, -286, 1110), accent);
add('door-2', box(247.68, 18, 1820, true).translate(132, -265.2, 1835), body);
add('door-pull-2', box(14, 14, 296, true).translate(214.56, -286, 1110), accent);
add('door-3', box(247.68, 18, 1820, true).translate(396, -265.2, 1835), body);
add('door-pull-3', box(14, 14, 296, true).translate(478.56, -286, 1110), accent);
add('vent-slot-0', box(384, 10, 9, true).translate(0, -270.4, 1447.5), accent);
add('vent-slot-1', box(384, 10, 9, true).translate(0, -270.4, 1473.5), accent);
add('vent-slot-2', box(384, 10, 9, true).translate(0, -270.4, 1499.5), accent);
add('vent-slot-3', box(384, 10, 9, true).translate(0, -270.4, 1525.5), accent);
add('vent-slot-4', box(384, 10, 9, true).translate(0, -270.4, 1551.5), accent);

return p.model();
