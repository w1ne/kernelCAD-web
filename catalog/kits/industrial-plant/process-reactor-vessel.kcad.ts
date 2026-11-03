// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly process reactor vessel scene prop, modeled from scratch.
meta({
  name: 'process-reactor-vessel',
  license: 'CC0-1.0',
  title: 'Process reactor vessel',
  description: 'Tall process reactor with a bolted top head, access platforms, side ports and braced supports. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#71848b', { label: 'Body color' });
const accent = param('accent', '#db9e3f', { label: 'Accent color' });
const p = assembly('process-reactor-vessel');
p.part('shell', cylinder(1025, 250, 10).translate(0, 0, 55).scale(scale).color(body));
p.part('roof-lip', cylinder(24, 265, 10).translate(0, 0, 1056).scale(scale).color(accent));
p.part('roof-cap', cylinder(36, 200, 10).translate(0, 0, 1080).scale(scale).color(body));
p.part('top-nozzle', cylinder(108, 35, 10).translate(0, 0, 1108).scale(scale).color(accent));
p.part('stiffener-0', cylinder(14, 260, 10).translate(0, 0, 311.2).scale(scale).color(accent));
p.part('stiffener-1', cylinder(14, 260, 10).translate(0, 0, 567.5).scale(scale).color(accent));
p.part('stiffener-2', cylinder(14, 260, 10).translate(0, 0, 823.8).scale(scale).color(accent));
p.part('support-leg-0', box(28, 28, 55, true).translate(180, 0, 27.5).scale(scale).color(accent));
p.part('foot-0', box(70, 56, 16, true).translate(180, 0, 8).scale(scale).color(body));
p.part('support-leg-1', box(28, 28, 55, true).translate(0, 180, 27.5).scale(scale).color(accent));
p.part('foot-1', box(70, 56, 16, true).translate(0, 180, 8).scale(scale).color(body));
p.part('support-leg-2', box(28, 28, 55, true).translate(-180, 0, 27.5).scale(scale).color(accent));
p.part('foot-2', box(70, 56, 16, true).translate(-180, 0, 8).scale(scale).color(body));
p.part('support-leg-3', box(28, 28, 55, true).translate(-0, -180, 27.5).scale(scale).color(accent));
p.part('foot-3', box(70, 56, 16, true).translate(-0, -180, 8).scale(scale).color(body));
p.part('side-nozzle', cylinder(175, 35, 10).rotate([0, 1, 0], 90).translate(142.5, 0, 604.8).scale(scale).color(accent));
p.part('side-flange', cylinder(20, 60, 10).rotate([0, 1, 0], 90).translate(315, 0, 604.8).scale(scale).color(body));
p.part('ladder-left-rail', box(12, 12, 842.4, true).translate(272.5, -190, 487).scale(scale).color(accent));
p.part('ladder-right-rail', box(12, 12, 842.4, true).translate(305, -190, 487).scale(scale).color(accent));
p.part('ladder-rung-0', box(14, 18, 12, true).translate(288.8, -190, 55).scale(scale).color(body));
p.part('ladder-rung-1', box(14, 18, 12, true).translate(288.8, -190, 184.6).scale(scale).color(body));
p.part('ladder-rung-2', box(14, 18, 12, true).translate(288.8, -190, 314.2).scale(scale).color(body));
p.part('ladder-rung-3', box(14, 18, 12, true).translate(288.8, -190, 443.8).scale(scale).color(body));
p.part('ladder-rung-4', box(14, 18, 12, true).translate(288.8, -190, 573.4).scale(scale).color(body));
p.part('ladder-rung-5', box(14, 18, 12, true).translate(288.8, -190, 703).scale(scale).color(body));
p.part('access-platform', box(675, 312.5, 16, true).translate(0, -170, 799.2).scale(scale).color(accent));
p.part('platform-rail', box(675, 14, 72, true).translate(0, -312.5, 842.4).scale(scale).color(body));

return p.model();
