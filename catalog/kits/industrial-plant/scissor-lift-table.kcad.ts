// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly scissor lift table scene prop, modeled from scratch.
meta({
  name: 'scissor-lift-table',
  license: 'CC0-1.0',
  title: 'Scissor lift table',
  description: 'Mobile scissor lift table with crossed lifting arms, platform deck, casters and control box. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'vehicle',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#6d7c82', { label: 'Body color' });
const accent = param('accent', '#e6a33e', { label: 'Accent color' });
const p = assembly('scissor-lift-table');
p.part('base', box(600, 420, 80, true).translate(0, 0, 40).scale(scale).color(body));
p.part('platform-deck', box(672, 453.6, 36, true).translate(0, 0, 582).scale(scale).color(accent));
p.part('scissor-arm-a--1', box(444, 36, 34, true).rotate([0, 1, 0], 34).translate(0, -100.8, 252).scale(scale).color(body));
p.part('scissor-arm-b--1', box(444, 36, 34, true).rotate([0, 1, 0], -34).translate(0, -100.8, 252).scale(scale).color(accent));
p.part('caster--1', cylinder(34, 40, 8).rotate([1, 0, 0], 90).translate(-216, -184.6, 40).scale(scale).color(accent));
p.part('scissor-arm-a-1', box(444, 36, 34, true).rotate([0, 1, 0], 34).translate(0, 100.8, 252).scale(scale).color(body));
p.part('scissor-arm-b-1', box(444, 36, 34, true).rotate([0, 1, 0], -34).translate(0, 100.8, 252).scale(scale).color(accent));
p.part('caster-1', cylinder(34, 40, 8).rotate([1, 0, 0], 90).translate(-216, 218.6, 40).scale(scale).color(accent));
p.part('control-box', box(90, 70, 150, true).translate(252, -168, 170).scale(scale).color(body));
p.part('safety-rail--1', box(20, 16, 90, true).translate(0, -201.6, 530).scale(scale).color(body));
p.part('safety-rail-1', box(20, 16, 90, true).translate(0, 201.6, 530).scale(scale).color(body));

return p.model();
