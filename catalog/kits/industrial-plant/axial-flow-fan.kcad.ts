// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly axial flow fan scene prop, modeled from scratch.
meta({
  name: 'axial-flow-fan',
  license: 'CC0-1.0',
  title: 'Axial flow fan',
  description: 'Axial flow fan with a faceted shroud, central hub, support frame and adjustable service mount. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#708087', { label: 'Body color' });
const accent = param('accent', '#e5ad48', { label: 'Accent color' });
const p = assembly('axial-flow-fan');
p.part('mounting-base', box(625, 216, 28, true).translate(0, 0, 14).scale(scale).color(accent));
p.part('fan-support', box(30, 34, 297, true).translate(0, 0, 151.2).scale(scale).color(body));
p.part('fan-shroud', cylinder(180, 250, 12).rotate([1, 0, 0], 90).translate(0, 90, 367.2).scale(scale).color(body));
p.part('front-rim', cylinder(24, 275, 12).rotate([1, 0, 0], 90).translate(0, -78, 367.2).scale(scale).color(accent));
p.part('hub', cylinder(153, 60, 8).rotate([1, 0, 0], 90).translate(0, 76.5, 367.2).scale(scale).color(accent));
p.part('fan-blade-0', box(215, 22, 30, true).rotate([0, 0, 1], 0).translate(0, 0, 367.2).scale(scale).color(body));
p.part('fan-blade-1', box(215, 22, 30, true).rotate([0, 0, 1], 72).translate(0, 0, 367.2).scale(scale).color(body));
p.part('fan-blade-2', box(215, 22, 30, true).rotate([0, 0, 1], 144).translate(0, 0, 367.2).scale(scale).color(body));
p.part('fan-blade-3', box(215, 22, 30, true).rotate([0, 0, 1], 216).translate(0, 0, 367.2).scale(scale).color(body));
p.part('fan-blade-4', box(215, 22, 30, true).rotate([0, 0, 1], 288).translate(0, 0, 367.2).scale(scale).color(body));
p.part('support-brace--1', box(375, 22, 18, true).rotate([0, 1, 0], -18).translate(-77.5, 0, 221.4).scale(scale).color(accent));
p.part('support-brace-1', box(375, 22, 18, true).rotate([0, 1, 0], 18).translate(77.5, 0, 221.4).scale(scale).color(accent));

return p.model();
