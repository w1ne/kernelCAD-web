// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly center island laboratory bench scene prop, modeled from scratch.
meta({
  name: 'center-island-lab-bench',
  license: 'CC0-1.0',
  title: 'Center island laboratory bench',
  description: 'Double-sided island bench with a broad worktop, four base bays and central service spine. Knobs: overall scale, body color and accent color.',
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
const p = assembly('center-island-lab-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1800, 1200, 32, true).translate(0, 0, 904), accent);
add('cabinet-kick-plinth', box(1620, 984, 80, true).translate(0, 0, 40), accent);
add('base-carcass-0', box(340.56, 936, 770, true).translate(-594, 0, 465), body);
add('base-door-0', box(313.315, 18, 735, true).translate(-594, -480, 457.5), accent);
add('door-pull-0', box(12, 18, 110, true).translate(-485.021, -516, 533.4), body);
add('base-carcass-1', box(340.56, 936, 770, true).translate(-198, 0, 465), body);
add('base-door-1', box(313.315, 18, 735, true).translate(-198, -480, 457.5), accent);
add('door-pull-1', box(12, 18, 110, true).translate(-89.021, -516, 533.4), body);
add('base-carcass-2', box(340.56, 936, 770, true).translate(198, 0, 465), body);
add('base-door-2', box(313.315, 18, 735, true).translate(198, -480, 457.5), accent);
add('door-pull-2', box(12, 18, 110, true).translate(306.979, -516, 533.4), body);
add('base-carcass-3', box(340.56, 936, 770, true).translate(594, 0, 465), body);
add('base-door-3', box(313.315, 18, 735, true).translate(594, -480, 457.5), accent);
add('door-pull-3', box(12, 18, 110, true).translate(702.979, -516, 533.4), body);
add('service-spine', box(216, 90, 360, true).translate(0, 0, 1100), body);
add('spine-outlet-0', box(52, 14, 34, true).translate(0, -52, 985), accent);
add('spine-outlet-1', box(52, 14, 34, true).translate(0, -52, 1053), accent);
add('spine-outlet-2', box(52, 14, 34, true).translate(0, -52, 1121), accent);
add('spine-outlet-3', box(52, 14, 34, true).translate(0, -52, 1189), accent);

return p.model();
