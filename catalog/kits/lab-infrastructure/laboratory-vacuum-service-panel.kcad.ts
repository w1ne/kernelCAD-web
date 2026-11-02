// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory vacuum service panel scene prop, modeled from scratch.
meta({
  name: 'laboratory-vacuum-service-panel',
  license: 'CC0-1.0',
  title: 'Laboratory vacuum service panel',
  description: 'Bench service panel with several vacuum outlets, labeled controls and a lower manifold rail. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-vacuum-service-panel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('service-panel', box(900, 150, 520, true).translate(0, 0, 260), body);
add('header', box(945, 20, 90, true).translate(0, -82.5, 520), accent);
add('lower-manifold', box(774, 30, 44, true).translate(0, -87, 115.6), accent);
add('port-block-0', box(74, 24, 70, true).translate(-333, -93, 217), accent);
add('control-knob-0', cylinder(36, 14, 8).translate(-333, -115.5, 164), body);
add('port-block-1', box(74, 24, 70, true).translate(-166.5, -93, 352.2), accent);
add('control-knob-1', cylinder(36, 14, 8).translate(-166.5, -115.5, 299.2), body);
add('port-block-2', box(74, 24, 70, true).translate(0, -93, 217), accent);
add('control-knob-2', cylinder(36, 14, 8).translate(0, -115.5, 164), body);
add('port-block-3', box(74, 24, 70, true).translate(166.5, -93, 352.2), accent);
add('control-knob-3', cylinder(36, 14, 8).translate(166.5, -115.5, 299.2), body);
add('port-block-4', box(74, 24, 70, true).translate(333, -93, 217), accent);
add('control-knob-4', cylinder(36, 14, 8).translate(333, -115.5, 164), body);

return p.model();
