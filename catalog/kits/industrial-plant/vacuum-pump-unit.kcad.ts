// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly vacuum pump unit scene prop, modeled from scratch.
meta({
  name: 'vacuum-pump-unit',
  license: 'CC0-1.0',
  title: 'Vacuum pump unit',
  description: 'Vacuum pump package with a horizontal motor, exhaust silencer, intake pipe and base rails. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#637a85', { label: 'Body color' });
const accent = param('accent', '#dda74b', { label: 'Accent color' });
const p = assembly('vacuum-pump-unit');
p.part('base-frame', box(640, 320, 38, true).translate(0, 0, 19).scale(scale).color(accent));
p.part('receiver', cylinder(409.6, 66.6, 12).rotate([0, 1, 0], 90).translate(-204.8, 0, 99.9).scale(scale).color(body));
p.part('motor', cylinder(230.4, 62.9, 12).rotate([0, 1, 0], 90).translate(-268.8, 0, 240.5).scale(scale).color(accent));
p.part('vacuum-pump-head', box(170, 140, 135, true).translate(153.6, 0, 240.5).scale(scale).color(body));
p.part('silencer', cylinder(150, 54, 10).rotate([0, 1, 0], 90).translate(155.4, 0, 325.6).scale(scale).color(accent));
p.part('intake-filter', cylinder(96, 52, 10).translate(-198.4, 0, 284.9).scale(scale).color(accent));
p.part('pressure-gauge', cylinder(22, 38, 10).rotate([1, 0, 0], 90).translate(160, -101, 255.3).scale(scale).color(accent));
p.part('air-line', cylinder(179.2, 18, 10).rotate([0, 1, 0], 90).translate(108.8, 0, 159.1).scale(scale).color(body));
p.part('vent-slot-0', box(9, 22, 118.4, true).translate(-179.2, -163.2, 185).scale(scale).color(accent));
p.part('vent-slot-1', box(9, 22, 118.4, true).translate(-157.2, -163.2, 185).scale(scale).color(accent));
p.part('vent-slot-2', box(9, 22, 118.4, true).translate(-135.2, -163.2, 185).scale(scale).color(accent));
p.part('vent-slot-3', box(9, 22, 118.4, true).translate(-113.2, -163.2, 185).scale(scale).color(accent));

return p.model();
