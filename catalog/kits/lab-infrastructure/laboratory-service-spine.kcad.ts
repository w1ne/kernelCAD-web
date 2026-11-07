// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory service spine scene prop, modeled from scratch.
meta({
  name: 'laboratory-service-spine',
  license: 'CC0-1.0',
  title: 'Laboratory service spine',
  description: 'Vertical bench service spine with separated power, data and utility panels. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-service-spine');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('service-panel', box(260, 160, 680, true).translate(0, 0, 340), body);
add('header', box(273, 20, 90, true).translate(0, -88, 680), accent);
add('lower-manifold', box(223.6, 30, 44, true).translate(0, -92.8, 144.4), accent);
add('port-block-0', box(74, 24, 70, true).translate(-96.2, -99.2, 273), accent);
add('control-knob-0', cylinder(36, 14, 8).translate(-96.2, -123.2, 220), body);
add('port-block-1', box(74, 24, 70, true).translate(-57.72, -99.2, 449.8), accent);
add('control-knob-1', cylinder(36, 14, 8).translate(-57.72, -123.2, 396.8), body);
add('port-block-2', box(74, 24, 70, true).translate(-19.24, -99.2, 273), accent);
add('control-knob-2', cylinder(36, 14, 8).translate(-19.24, -123.2, 220), body);
add('port-block-3', box(74, 24, 70, true).translate(19.24, -99.2, 449.8), accent);
add('control-knob-3', cylinder(36, 14, 8).translate(19.24, -123.2, 396.8), body);
add('port-block-4', box(74, 24, 70, true).translate(57.72, -99.2, 273), accent);
add('control-knob-4', cylinder(36, 14, 8).translate(57.72, -123.2, 220), body);
add('port-block-5', box(74, 24, 70, true).translate(96.2, -99.2, 449.8), accent);
add('control-knob-5', cylinder(36, 14, 8).translate(96.2, -123.2, 396.8), body);

return p.model();
