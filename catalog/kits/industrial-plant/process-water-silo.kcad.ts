// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly process water silo scene prop, modeled from scratch.
meta({
  name: 'process-water-silo',
  license: 'CC0-1.0',
  title: 'Process water silo',
  description: 'Tall process silo with a roof cap, ring stiffeners, discharge hopper and four support legs. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#77838a', { label: 'Body color' });
const accent = param('accent', '#d9a343', { label: 'Accent color' });
const p = assembly('process-water-silo');
p.part('shell', cylinder(925, 290, 10).translate(0, 0, 95).scale(scale).color(body));
p.part('roof-lip', cylinder(24, 307.4, 10).translate(0, 0, 996).scale(scale).color(accent));
p.part('roof-cap', cylinder(36, 232, 10).translate(0, 0, 1020).scale(scale).color(body));
p.part('top-nozzle', cylinder(102, 40.6, 10).translate(0, 0, 1048).scale(scale).color(accent));
p.part('discharge-transition', cylinder(90, 168.2, 10).translate(0, 0, 7).scale(scale).color(accent));
p.part('discharge-neck', cylinder(92, 52.2, 10).translate(0, 0, 3).scale(scale).color(body));
p.part('stiffener-0', cylinder(14, 301.6, 10).translate(0, 0, 557.5).scale(scale).color(accent));
p.part('support-leg-0', box(28, 28, 95, true).translate(208.8, 0, 47.5).scale(scale).color(accent));
p.part('foot-0', box(70, 56, 16, true).translate(208.8, 0, 8).scale(scale).color(body));
p.part('support-leg-1', box(28, 28, 95, true).translate(0, 208.8, 47.5).scale(scale).color(accent));
p.part('foot-1', box(70, 56, 16, true).translate(0, 208.8, 8).scale(scale).color(body));
p.part('support-leg-2', box(28, 28, 95, true).translate(-208.8, 0, 47.5).scale(scale).color(accent));
p.part('foot-2', box(70, 56, 16, true).translate(-208.8, 0, 8).scale(scale).color(body));
p.part('support-leg-3', box(28, 28, 95, true).translate(-0, -208.8, 47.5).scale(scale).color(accent));
p.part('foot-3', box(70, 56, 16, true).translate(-0, -208.8, 8).scale(scale).color(body));
p.part('side-nozzle', cylinder(203, 40.6, 10).rotate([0, 1, 0], 90).translate(165.3, 0, 571.2).scale(scale).color(accent));
p.part('side-flange', cylinder(20, 69.6, 10).rotate([0, 1, 0], 90).translate(367, 0, 571.2).scale(scale).color(body));
p.part('ladder-left-rail', box(12, 12, 795.6, true).translate(316.1, -220.4, 503).scale(scale).color(accent));
p.part('ladder-right-rail', box(12, 12, 795.6, true).translate(353.8, -220.4, 503).scale(scale).color(accent));
p.part('ladder-rung-0', box(14, 18, 12, true).translate(334.9, -220.4, 95).scale(scale).color(body));
p.part('ladder-rung-1', box(14, 18, 12, true).translate(334.9, -220.4, 217.4).scale(scale).color(body));
p.part('ladder-rung-2', box(14, 18, 12, true).translate(334.9, -220.4, 339.8).scale(scale).color(body));
p.part('ladder-rung-3', box(14, 18, 12, true).translate(334.9, -220.4, 462.2).scale(scale).color(body));
p.part('ladder-rung-4', box(14, 18, 12, true).translate(334.9, -220.4, 584.6).scale(scale).color(body));
p.part('ladder-rung-5', box(14, 18, 12, true).translate(334.9, -220.4, 707).scale(scale).color(body));

return p.model();
