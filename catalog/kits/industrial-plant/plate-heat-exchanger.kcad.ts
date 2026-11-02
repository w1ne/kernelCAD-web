// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly plate heat exchanger scene prop, modeled from scratch.
meta({
  name: 'plate-heat-exchanger',
  license: 'CC0-1.0',
  title: 'Plate heat exchanger',
  description: 'Compact plate heat exchanger with a pack of cooling plates, tie bars and four connection ports. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#647b84', { label: 'Body color' });
const accent = param('accent', '#e4ad4b', { label: 'Accent color' });
const p = assembly('plate-heat-exchanger');
p.part('base-frame', box(492.8, 198, 32, true).translate(0, 0, 16).scale(scale).color(accent));
p.part('fixed-end-plate', box(32, 220, 620, true).translate(-184.8, 0, 310).scale(scale).color(body));
p.part('movable-end-plate', box(32, 220, 620, true).translate(184.8, 0, 310).scale(scale).color(accent));
p.part('heat-plate-0', box(15, 180.4, 483.6, true).translate(-140.8, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-1', box(15, 180.4, 483.6, true).translate(-107.6, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-2', box(15, 180.4, 483.6, true).translate(-74.3, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-3', box(15, 180.4, 483.6, true).translate(-41.1, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-4', box(15, 180.4, 483.6, true).translate(-7.8, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-5', box(15, 180.4, 483.6, true).translate(25.4, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-6', box(15, 180.4, 483.6, true).translate(58.7, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-7', box(15, 180.4, 483.6, true).translate(91.9, 0, 334.8).scale(scale).color(body));
p.part('heat-plate-8', box(15, 180.4, 483.6, true).translate(125.2, 0, 334.8).scale(scale).color(body));
p.part('tie-bar-0', box(360.8, 18, 18, true).translate(0, -66, 570.4).scale(scale).color(accent));
p.part('tie-bar-1', box(360.8, 18, 18, true).translate(0, 66, 570.4).scale(scale).color(accent));
p.part('port-0', cylinder(62, 38, 10).translate(-154, 0, 446.4).scale(scale).color(accent));
p.part('port-flange-0', cylinder(16, 58, 10).translate(-154, 0, 452.6).scale(scale).color(body));
p.part('port-1', cylinder(62, 38, 10).translate(154, 0, 446.4).scale(scale).color(accent));
p.part('port-flange-1', cylinder(16, 58, 10).translate(154, 0, 452.6).scale(scale).color(body));

return p.model();
