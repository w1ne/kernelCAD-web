// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly horizontal pressure vessel scene prop, modeled from scratch.
meta({
  name: 'horizontal-pressure-vessel',
  license: 'CC0-1.0',
  title: 'Horizontal pressure vessel',
  description: 'Horizontal pressure vessel on saddle supports with end flanges, top nozzles and a service gauge. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#607986', { label: 'Body color' });
const accent = param('accent', '#e2a849', { label: 'Accent color' });
const p = assembly('horizontal-pressure-vessel');
p.part('pressure-shell', cylinder(1050, 220, 10).rotate([0, 1, 0], 90).translate(-525, 0, 350).translate(0, 0, -0.5).scale(scale).color(body));
p.part('left-head', cylinder(28, 233.2, 10).rotate([0, 1, 0], 90).translate(-547, 0, 350).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('right-head', cylinder(28, 233.2, 10).rotate([0, 1, 0], 90).translate(519, 0, 350).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('skid-rail-left', box(945, 30, 35, true).translate(0, -132, 18).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('skid-rail-right', box(945, 30, 35, true).translate(0, 132, 18).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('saddle-0', box(95, 517, 90, true).translate(-294, 0, 118.8).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('saddle-foot-0', box(130, 561, 18, true).translate(-294, 0, 10).translate(0, 0, -0.5).scale(scale).color(body));
p.part('saddle-1', box(95, 517, 90, true).translate(294, 0, 118.8).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('saddle-foot-1', box(130, 561, 18, true).translate(294, 0, 10).translate(0, 0, -0.5).scale(scale).color(body));
p.part('top-port-0', cylinder(78, 30.8, 10).translate(-294, 0, 566).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('port-flange-0', cylinder(16, 46.2, 10).translate(-294, 0, 623).translate(0, 0, -0.5).scale(scale).color(body));
p.part('top-port-1', cylinder(78, 30.8, 10).translate(294, 0, 566).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('port-flange-1', cylinder(16, 46.2, 10).translate(294, 0, 623).translate(0, 0, -0.5).scale(scale).color(body));
p.part('pressure-gauge', cylinder(26, 42, 10).rotate([1, 0, 0], 90).translate(147, -167.4, 429.2).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('drain', cylinder(62, 19.8, 10).translate(0, 0, 18).translate(0, 0, -0.5).scale(scale).color(accent));

return p.model();
