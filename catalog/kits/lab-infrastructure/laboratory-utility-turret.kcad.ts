// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory utility turret scene prop, modeled from scratch.
meta({
  name: 'laboratory-utility-turret',
  license: 'CC0-1.0',
  title: 'Laboratory utility turret',
  description: 'Floor-to-ceiling service turret with layered panels, utility sockets and a cap rail. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-utility-turret');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('turret-core', box(280, 240, 2100, true).translate(0, 0, 1050), body);
add('base-plinth', box(420, 360, 75, true).translate(0, 0, 37.5), accent);
add('service-cap', box(364, 312, 60, true).translate(0, 0, 2100), accent);
add('turret-port-0', box(173.6, 22, 64, true).translate(0, -132, 212), accent);
add('port-socket-0', box(61.6, 12, 30, true).translate(0, -168, 195), body);
add('turret-port-1', box(173.6, 22, 64, true).translate(0, -132, 647), accent);
add('port-socket-1', box(61.6, 12, 30, true).translate(0, -168, 630), body);
add('turret-port-2', box(173.6, 22, 64, true).translate(0, -132, 1082), accent);
add('port-socket-2', box(61.6, 12, 30, true).translate(0, -168, 1065), body);
add('turret-port-3', box(173.6, 22, 64, true).translate(0, -132, 1517), accent);
add('port-socket-3', box(61.6, 12, 30, true).translate(0, -168, 1500), body);
add('turret-port-4', box(173.6, 22, 64, true).translate(0, -132, 1952), accent);
add('port-socket-4', box(61.6, 12, 30, true).translate(0, -168, 1935), body);

return p.model();
