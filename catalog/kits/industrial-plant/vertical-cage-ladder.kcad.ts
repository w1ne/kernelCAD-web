// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly vertical cage ladder scene prop, modeled from scratch.
meta({
  name: 'vertical-cage-ladder',
  license: 'CC0-1.0',
  title: 'Vertical cage ladder',
  description: 'Fixed vertical access ladder with evenly spaced rungs, side rails and a wraparound safety cage. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#6f7f85', { label: 'Body color' });
const accent = param('accent', '#e2a846', { label: 'Accent color' });
const p = assembly('vertical-cage-ladder');
p.part('ladder-rail--1', box(24, 24, 930, true).translate(-88.2, 0, 465).scale(scale).color(body));
p.part('ladder-rail-1', box(24, 24, 930, true).translate(88.2, 0, 465).scale(scale).color(body));
p.part('rung-0', box(193.2, 26, 18, true).translate(0, 0, 35).scale(scale).color(accent));
p.part('rung-1', box(193.2, 26, 18, true).translate(0, 0, 157.9).scale(scale).color(accent));
p.part('rung-2', box(193.2, 26, 18, true).translate(0, 0, 280.7).scale(scale).color(accent));
p.part('rung-3', box(193.2, 26, 18, true).translate(0, 0, 403.6).scale(scale).color(accent));
p.part('rung-4', box(193.2, 26, 18, true).translate(0, 0, 526.4).scale(scale).color(accent));
p.part('rung-5', box(193.2, 26, 18, true).translate(0, 0, 649.3).scale(scale).color(accent));
p.part('rung-6', box(193.2, 26, 18, true).translate(0, 0, 772.1).scale(scale).color(accent));
p.part('rung-7', box(193.2, 26, 18, true).translate(0, 0, 895).scale(scale).color(accent));
p.part('safety-hoop-0', cylinder(160, 151.2, 8).rotate([1, 0, 0], 90).translate(0, 80, 325.5).scale(scale).color(accent));
p.part('hoop-support-0', box(16, 118.4, 16, true).translate(0, 0, 325.5).scale(scale).color(body));
p.part('safety-hoop-1', cylinder(160, 151.2, 8).rotate([1, 0, 0], 90).translate(0, 80, 465).scale(scale).color(accent));
p.part('hoop-support-1', box(16, 118.4, 16, true).translate(0, 0, 465).scale(scale).color(body));
p.part('safety-hoop-2', cylinder(160, 151.2, 8).rotate([1, 0, 0], 90).translate(0, 80, 604.5).scale(scale).color(accent));
p.part('hoop-support-2', box(16, 118.4, 16, true).translate(0, 0, 604.5).scale(scale).color(body));
p.part('safety-hoop-3', cylinder(160, 151.2, 8).rotate([1, 0, 0], 90).translate(0, 80, 744).scale(scale).color(accent));
p.part('hoop-support-3', box(16, 118.4, 16, true).translate(0, 0, 744).scale(scale).color(body));
p.part('top-grab-left', box(18, 22, 110, true).translate(-88.2, 0, 980).scale(scale).color(accent));
p.part('top-grab-right', box(18, 22, 110, true).translate(88.2, 0, 980).scale(scale).color(accent));

return p.model();
