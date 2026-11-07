// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory electrical service rail scene prop, modeled from scratch.
meta({
  name: 'laboratory-electrical-service-rail',
  license: 'CC0-1.0',
  title: 'Laboratory electrical service rail',
  description: 'Long bench power rail with separated outlet blocks, end caps and wall brackets. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-electrical-service-rail');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('mounting-rail', box(1400, 110, 180, true).translate(0, 0, 90), body);
add('outlet-module-0', box(110, 35, 111.6, true).translate(-588, -71.5, 149.4), accent);
add('socket-0', box(45, 10, 48, true).translate(-588, -93.5, 117.6), body);
add('outlet-module-1', box(110, 35, 111.6, true).translate(-352.8, -71.5, 149.4), accent);
add('socket-1', box(45, 10, 48, true).translate(-352.8, -93.5, 117.6), body);
add('outlet-module-2', box(110, 35, 111.6, true).translate(-117.6, -71.5, 149.4), accent);
add('socket-2', box(45, 10, 48, true).translate(-117.6, -93.5, 117.6), body);
add('outlet-module-3', box(110, 35, 111.6, true).translate(117.6, -71.5, 149.4), accent);
add('socket-3', box(45, 10, 48, true).translate(117.6, -93.5, 117.6), body);
add('outlet-module-4', box(110, 35, 111.6, true).translate(352.8, -71.5, 149.4), accent);
add('socket-4', box(45, 10, 48, true).translate(352.8, -93.5, 117.6), body);
add('outlet-module-5', box(110, 35, 111.6, true).translate(588, -71.5, 149.4), accent);
add('socket-5', box(45, 10, 48, true).translate(588, -93.5, 117.6), body);
add('end-cap--1', box(50, 132, 234, true).translate(-728, 0, 117), accent);
add('end-cap-1', box(50, 132, 234, true).translate(728, 0, 117), accent);

return p.model();
