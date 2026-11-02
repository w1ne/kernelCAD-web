// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly vertical storage tank scene prop, modeled from scratch.
meta({
  name: 'vertical-storage-tank',
  license: 'CC0-1.0',
  title: 'Vertical storage tank',
  description: 'Vertical liquid storage tank with a domed-looking roof, service ladder and foundation legs. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#74828a', { label: 'Body color' });
const accent = param('accent', '#e6ad4e', { label: 'Accent color' });
const p = assembly('vertical-storage-tank');
p.part('shell', cylinder(865, 300, 10).translate(0, 0, 55).scale(scale).color(body));
p.part('roof-lip', cylinder(24, 318, 10).translate(0, 0, 896).scale(scale).color(accent));
p.part('roof-cap', cylinder(36, 240, 10).translate(0, 0, 920).scale(scale).color(body));
p.part('top-nozzle', cylinder(92, 42, 10).translate(0, 0, 948).scale(scale).color(accent));
p.part('stiffener-0', cylinder(14, 312, 10).translate(0, 0, 343.3).scale(scale).color(accent));
p.part('stiffener-1', cylinder(14, 312, 10).translate(0, 0, 631.7).scale(scale).color(accent));
p.part('support-leg-0', box(28, 28, 55, true).translate(216, 0, 27.5).scale(scale).color(accent));
p.part('foot-0', box(70, 56, 16, true).translate(216, 0, 8).scale(scale).color(body));
p.part('support-leg-1', box(28, 28, 55, true).translate(0, 216, 27.5).scale(scale).color(accent));
p.part('foot-1', box(70, 56, 16, true).translate(0, 216, 8).scale(scale).color(body));
p.part('support-leg-2', box(28, 28, 55, true).translate(-216, 0, 27.5).scale(scale).color(accent));
p.part('foot-2', box(70, 56, 16, true).translate(-216, 0, 8).scale(scale).color(body));
p.part('support-leg-3', box(28, 28, 55, true).translate(-0, -216, 27.5).scale(scale).color(accent));
p.part('foot-3', box(70, 56, 16, true).translate(-0, -216, 8).scale(scale).color(body));
p.part('side-nozzle', cylinder(210, 42, 10).rotate([0, 1, 0], 90).translate(171, 0, 515.2).scale(scale).color(accent));
p.part('side-flange', cylinder(20, 72, 10).rotate([0, 1, 0], 90).translate(380, 0, 515.2).scale(scale).color(body));
p.part('ladder-left-rail', box(12, 12, 717.6, true).translate(327, -228, 423).scale(scale).color(accent));
p.part('ladder-right-rail', box(12, 12, 717.6, true).translate(366, -228, 423).scale(scale).color(accent));
p.part('ladder-rung-0', box(14, 18, 12, true).translate(346.5, -228, 55).scale(scale).color(body));
p.part('ladder-rung-1', box(14, 18, 12, true).translate(346.5, -228, 165.4).scale(scale).color(body));
p.part('ladder-rung-2', box(14, 18, 12, true).translate(346.5, -228, 275.8).scale(scale).color(body));
p.part('ladder-rung-3', box(14, 18, 12, true).translate(346.5, -228, 386.2).scale(scale).color(body));
p.part('ladder-rung-4', box(14, 18, 12, true).translate(346.5, -228, 496.6).scale(scale).color(body));
p.part('ladder-rung-5', box(14, 18, 12, true).translate(346.5, -228, 607).scale(scale).color(body));

return p.model();
