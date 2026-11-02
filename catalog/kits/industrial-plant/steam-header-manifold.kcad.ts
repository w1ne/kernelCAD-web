// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly steam header manifold scene prop, modeled from scratch.
meta({
  name: 'steam-header-manifold',
  license: 'CC0-1.0',
  title: 'Steam header manifold',
  description: 'Steam distribution header with five branch risers, isolation wheels and a raised pressure gauge. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#6e7d84', { label: 'Body color' });
const accent = param('accent', '#dfa945', { label: 'Accent color' });
const p = assembly('steam-header-manifold');
p.part('support-skid', box(920, 310, 34, true).translate(0, 0, 17).scale(scale).color(accent));
p.part('main-header', cylinder(828, 42, 10).rotate([0, 1, 0], 90).translate(-414, 0, 193.2).scale(scale).color(body));
p.part('branch-0', cylinder(180.6, 20, 10).translate(-349.6, 0, 193.2).scale(scale).color(accent));
p.part('branch-flange-0', cylinder(18, 40, 10).translate(-349.6, 0, 344.4).scale(scale).color(body));
p.part('valve-body-0', cylinder(62, 32, 10).translate(-349.6, 0, 281.4).scale(scale).color(body));
p.part('valve-handle-0', cylinder(115, 10, 8).rotate([0, 1, 0], 90).translate(-407.1, 0, 302.4).scale(scale).color(accent));
p.part('branch-1', cylinder(180.6, 20, 10).translate(-174.8, 0, 193.2).scale(scale).color(accent));
p.part('branch-flange-1', cylinder(18, 40, 10).translate(-174.8, 0, 344.4).scale(scale).color(body));
p.part('valve-body-1', cylinder(62, 32, 10).translate(-174.8, 0, 281.4).scale(scale).color(body));
p.part('valve-handle-1', cylinder(115, 10, 8).rotate([0, 1, 0], 90).translate(-232.3, 0, 302.4).scale(scale).color(accent));
p.part('branch-2', cylinder(180.6, 20, 10).translate(0, 0, 193.2).scale(scale).color(accent));
p.part('branch-flange-2', cylinder(18, 40, 10).translate(0, 0, 344.4).scale(scale).color(body));
p.part('valve-body-2', cylinder(62, 32, 10).translate(0, 0, 281.4).scale(scale).color(body));
p.part('valve-handle-2', cylinder(115, 10, 8).rotate([0, 1, 0], 90).translate(-57.5, 0, 302.4).scale(scale).color(accent));
p.part('branch-3', cylinder(180.6, 20, 10).translate(174.8, 0, 193.2).scale(scale).color(accent));
p.part('branch-flange-3', cylinder(18, 40, 10).translate(174.8, 0, 344.4).scale(scale).color(body));
p.part('valve-body-3', cylinder(62, 32, 10).translate(174.8, 0, 281.4).scale(scale).color(body));
p.part('valve-handle-3', cylinder(115, 10, 8).rotate([0, 1, 0], 90).translate(117.3, 0, 302.4).scale(scale).color(accent));
p.part('branch-4', cylinder(180.6, 20, 10).translate(349.6, 0, 193.2).scale(scale).color(accent));
p.part('branch-flange-4', cylinder(18, 40, 10).translate(349.6, 0, 344.4).scale(scale).color(body));
p.part('valve-body-4', cylinder(62, 32, 10).translate(349.6, 0, 281.4).scale(scale).color(body));
p.part('valve-handle-4', cylinder(115, 10, 8).rotate([0, 1, 0], 90).translate(292.1, 0, 302.4).scale(scale).color(accent));
p.part('header-gauge', cylinder(20, 37, 10).rotate([1, 0, 0], 90).translate(0, -101.6, 268.8).scale(scale).color(accent));

return p.model();
