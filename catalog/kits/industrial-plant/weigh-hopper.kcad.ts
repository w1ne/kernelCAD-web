// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly weigh hopper scene prop, modeled from scratch.
meta({
  name: 'weigh-hopper',
  license: 'CC0-1.0',
  title: 'Weigh hopper',
  description: 'Batch weigh hopper with a broad upper bin, load-cell supports, discharge cone and outlet gate. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#748089', { label: 'Body color' });
const accent = param('accent', '#e0a747', { label: 'Accent color' });
const p = assembly('weigh-hopper');
p.part('upper-bin', box(520, 440, 292.8, true).translate(0, 0, 414.8).scale(scale).color(body));
p.part('top-rim', box(561.6, 475.2, 28, true).translate(0, 0, 567.3).scale(scale).color(accent));
p.part('hopper-transition-upper', cylinder(97.6, 197.6, 10).translate(0, 0, 109.8).scale(scale).color(accent));
p.part('hopper-transition-lower', cylinder(85.4, 98.8, 10).translate(0, 0, 61).scale(scale).color(body));
p.part('outlet', cylinder(62, 62.4, 10).translate(0, 0, 0).scale(scale).color(accent));
p.part('support-leg-0', box(30, 30, 414.8, true).translate(-218.4, -184.8, 207.4).scale(scale).color(body));
p.part('foot-0', box(84, 76, 18, true).translate(-218.4, -184.8, 9).scale(scale).color(accent));
p.part('support-leg-1', box(30, 30, 414.8, true).translate(218.4, -184.8, 207.4).scale(scale).color(body));
p.part('foot-1', box(84, 76, 18, true).translate(218.4, -184.8, 9).scale(scale).color(accent));
p.part('support-leg-2', box(30, 30, 414.8, true).translate(-218.4, 184.8, 207.4).scale(scale).color(body));
p.part('foot-2', box(84, 76, 18, true).translate(-218.4, 184.8, 9).scale(scale).color(accent));
p.part('support-leg-3', box(30, 30, 414.8, true).translate(218.4, 184.8, 207.4).scale(scale).color(body));
p.part('foot-3', box(84, 76, 18, true).translate(218.4, 184.8, 9).scale(scale).color(accent));
p.part('slide-gate', box(228.8, 154, 24, true).translate(0, 0, 82).scale(scale).color(accent));

return p.model();
