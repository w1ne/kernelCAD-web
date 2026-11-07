// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly compressed air receiver scene prop, modeled from scratch.
meta({
  name: 'compressed-air-receiver',
  license: 'CC0-1.0',
  title: 'Compressed air receiver',
  description: 'Compressed-air receiver tank with saddle feet, drain valve, top port and pressure gauge. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#6a7e87', { label: 'Body color' });
const accent = param('accent', '#e6ae48', { label: 'Accent color' });
const p = assembly('compressed-air-receiver');
p.part('pressure-shell', cylinder(840, 185, 10).rotate([0, 1, 0], 90).translate(-420, 0, 315).translate(0, 0, -0.5).scale(scale).color(body));
p.part('left-head', cylinder(28, 196.1, 10).rotate([0, 1, 0], 90).translate(-442, 0, 315).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('right-head', cylinder(28, 196.1, 10).rotate([0, 1, 0], 90).translate(414, 0, 315).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('skid-rail-left', box(756, 30, 35, true).translate(0, -111, 18).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('skid-rail-right', box(756, 30, 35, true).translate(0, 111, 18).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('saddle-0', box(95, 434.8, 90, true).translate(-235.2, 0, 99.9).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('saddle-foot-0', box(130, 471.7, 18, true).translate(-235.2, 0, 10).translate(0, 0, -0.5).scale(scale).color(body));
p.part('saddle-1', box(95, 434.8, 90, true).translate(235.2, 0, 99.9).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('saddle-foot-1', box(130, 471.7, 18, true).translate(235.2, 0, 10).translate(0, 0, -0.5).scale(scale).color(body));
p.part('top-port-0', cylinder(78, 25.9, 10).translate(-235.2, 0, 496).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('port-flange-0', cylinder(16, 38.9, 10).translate(-235.2, 0, 553).translate(0, 0, -0.5).scale(scale).color(body));
p.part('top-port-1', cylinder(78, 25.9, 10).translate(0, 0, 496).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('port-flange-1', cylinder(16, 38.9, 10).translate(0, 0, 553).translate(0, 0, -0.5).scale(scale).color(body));
p.part('top-port-2', cylinder(78, 25.9, 10).translate(235.2, 0, 496).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('port-flange-2', cylinder(16, 38.9, 10).translate(235.2, 0, 553).translate(0, 0, -0.5).scale(scale).color(body));
p.part('pressure-gauge', cylinder(26, 42, 10).rotate([1, 0, 0], 90).translate(117.6, -138.7, 381.6).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('drain', cylinder(62, 16.6, 10).translate(0, 0, 18).translate(0, 0, -0.5).scale(scale).color(accent));

return p.model();
