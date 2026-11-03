// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly distillation column scene prop, modeled from scratch.
meta({
  name: 'distillation-column',
  license: 'CC0-1.0',
  title: 'Distillation column',
  description: 'Slender distillation column with stacked tray bands, a crown nozzle and an operator platform. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#74838b', { label: 'Body color' });
const accent = param('accent', '#e2b455', { label: 'Accent color' });
const p = assembly('distillation-column');
p.part('shell', cylinder(1345, 155, 10).translate(0, 0, 55).scale(scale).color(body));
p.part('roof-lip', cylinder(24, 164.3, 10).translate(0, 0, 1376).scale(scale).color(accent));
p.part('roof-cap', cylinder(36, 124, 10).translate(0, 0, 1400).scale(scale).color(body));
p.part('top-nozzle', cylinder(140, 21.7, 10).translate(0, 0, 1428).scale(scale).color(accent));
p.part('service-deck-0', box(410.8, 348.8, 14, true).translate(0, -18.6, 476).scale(scale).color(accent));
p.part('deck-post-0', box(12, 12, 76, true).translate(167.4, -18.6, 519).scale(scale).color(body));
p.part('service-deck-1', box(410.8, 348.8, 14, true).translate(0, -18.6, 756).scale(scale).color(accent));
p.part('deck-post-1', box(12, 12, 76, true).translate(167.4, -18.6, 799).scale(scale).color(body));
p.part('service-deck-2', box(410.8, 348.8, 14, true).translate(0, -18.6, 1036).scale(scale).color(accent));
p.part('deck-post-2', box(12, 12, 76, true).translate(167.4, -18.6, 1079).scale(scale).color(body));
p.part('support-leg-0', box(28, 28, 55, true).translate(111.6, 0, 27.5).scale(scale).color(accent));
p.part('foot-0', box(70, 56, 16, true).translate(111.6, 0, 8).scale(scale).color(body));
p.part('support-leg-1', box(28, 28, 55, true).translate(0, 111.6, 27.5).scale(scale).color(accent));
p.part('foot-1', box(70, 56, 16, true).translate(0, 111.6, 8).scale(scale).color(body));
p.part('support-leg-2', box(28, 28, 55, true).translate(-111.6, 0, 27.5).scale(scale).color(accent));
p.part('foot-2', box(70, 56, 16, true).translate(-111.6, 0, 8).scale(scale).color(body));
p.part('support-leg-3', box(28, 28, 55, true).translate(-0, -111.6, 27.5).scale(scale).color(accent));
p.part('foot-3', box(70, 56, 16, true).translate(-0, -111.6, 8).scale(scale).color(body));
p.part('side-nozzle', cylinder(108.5, 21.7, 10).rotate([0, 1, 0], 90).translate(88.3, 0, 784).scale(scale).color(accent));
p.part('side-flange', cylinder(20, 37.2, 10).rotate([0, 1, 0], 90).translate(191.5, 0, 784).scale(scale).color(body));
p.part('ladder-left-rail', box(12, 12, 1092, true).translate(169, -117.8, 615).scale(scale).color(accent));
p.part('ladder-right-rail', box(12, 12, 1092, true).translate(189.1, -117.8, 615).scale(scale).color(accent));
p.part('ladder-rung-0', box(14, 18, 12, true).translate(179, -117.8, 55).scale(scale).color(body));
p.part('ladder-rung-1', box(14, 18, 12, true).translate(179, -117.8, 223).scale(scale).color(body));
p.part('ladder-rung-2', box(14, 18, 12, true).translate(179, -117.8, 391).scale(scale).color(body));
p.part('ladder-rung-3', box(14, 18, 12, true).translate(179, -117.8, 559).scale(scale).color(body));
p.part('ladder-rung-4', box(14, 18, 12, true).translate(179, -117.8, 727).scale(scale).color(body));
p.part('ladder-rung-5', box(14, 18, 12, true).translate(179, -117.8, 895).scale(scale).color(body));

return p.model();
