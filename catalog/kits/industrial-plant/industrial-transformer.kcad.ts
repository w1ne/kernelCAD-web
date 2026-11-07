// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly industrial distribution transformer scene prop, modeled from scratch.
meta({
  name: 'industrial-transformer',
  license: 'CC0-1.0',
  title: 'Industrial distribution transformer',
  description: 'Compact distribution transformer with radiator panels, lifting lugs, bushings and wheel skids. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#758080', { label: 'Body color' });
const accent = param('accent', '#e0a744', { label: 'Accent color' });
const p = assembly('industrial-transformer');
p.part('tank', box(403.2, 315, 414.8, true).translate(0, 0, 268.4).scale(scale).color(body));
p.part('base-skid', box(604.8, 441, 35, true).translate(0, 0, 18).scale(scale).color(accent));
p.part('radiator-fin-0', box(18, 79.8, 292.8, true).translate(-201.6, -193.2, 256.2).scale(scale).color(accent));
p.part('radiator-fin-1', box(18, 79.8, 292.8, true).translate(-134.4, -193.2, 256.2).scale(scale).color(accent));
p.part('radiator-fin-2', box(18, 79.8, 292.8, true).translate(-67.2, -193.2, 256.2).scale(scale).color(accent));
p.part('radiator-fin-3', box(18, 79.8, 292.8, true).translate(0, -193.2, 256.2).scale(scale).color(accent));
p.part('radiator-fin-4', box(18, 79.8, 292.8, true).translate(67.2, -193.2, 256.2).scale(scale).color(accent));
p.part('radiator-fin-5', box(18, 79.8, 292.8, true).translate(134.4, -193.2, 256.2).scale(scale).color(accent));
p.part('radiator-fin-6', box(18, 79.8, 292.8, true).translate(201.6, -193.2, 256.2).scale(scale).color(accent));
p.part('bushing-0', cylinder(122, 34, 8).translate(-123.2, 0, 475.8).scale(scale).color(accent));
p.part('terminal-0', cylinder(30, 18, 10).translate(-123.2, 0, 597.8).scale(scale).color(body));
p.part('bushing-1', cylinder(122, 34, 8).translate(0, 0, 475.8).scale(scale).color(accent));
p.part('terminal-1', cylinder(30, 18, 10).translate(0, 0, 597.8).scale(scale).color(body));
p.part('bushing-2', cylinder(122, 34, 8).translate(123.2, 0, 475.8).scale(scale).color(accent));
p.part('terminal-2', cylinder(30, 18, 10).translate(123.2, 0, 597.8).scale(scale).color(body));
p.part('wheel--1', cylinder(32, 55, 8).rotate([1, 0, 0], 90).translate(-190.4, 192.4, 55).scale(scale).color(body));
p.part('wheel-1', cylinder(32, 55, 8).rotate([1, 0, 0], 90).translate(190.4, 192.4, 55).scale(scale).color(body));
p.part('lifting-lug-left', box(25, 30, 60, true).translate(-218.4, 0, 518.5).scale(scale).color(accent));
p.part('lifting-lug-right', box(25, 30, 60, true).translate(218.4, 0, 518.5).scale(scale).color(accent));

return p.model();
