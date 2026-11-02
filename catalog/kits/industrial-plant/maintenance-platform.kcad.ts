// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly maintenance platform scene prop, modeled from scratch.
meta({
  name: 'maintenance-platform',
  license: 'CC0-1.0',
  title: 'Maintenance platform',
  description: 'Raised maintenance platform with toe boards, guarded perimeter, access ladder and braced legs. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#738087', { label: 'Body color' });
const accent = param('accent', '#e0a33f', { label: 'Accent color' });
const p = assembly('maintenance-platform');
p.part('deck', box(620, 540, 28, true).translate(0, 0, 660).scale(scale).color(accent));
p.part('post--260-4--226-79999999999998', box(32, 32, 660, true).translate(-260.4, -226.8, 330).scale(scale).color(body));
p.part('base-foot--260-4--226-79999999999998', box(82, 82, 18, true).translate(-260.4, -226.8, 9).scale(scale).color(accent));
p.part('post--260-4-226-79999999999998', box(32, 32, 660, true).translate(-260.4, 226.8, 330).scale(scale).color(body));
p.part('base-foot--260-4-226-79999999999998', box(82, 82, 18, true).translate(-260.4, 226.8, 9).scale(scale).color(accent));
p.part('post-260-4--226-79999999999998', box(32, 32, 660, true).translate(260.4, -226.8, 330).scale(scale).color(body));
p.part('base-foot-260-4--226-79999999999998', box(82, 82, 18, true).translate(260.4, -226.8, 9).scale(scale).color(accent));
p.part('post-260-4-226-79999999999998', box(32, 32, 660, true).translate(260.4, 226.8, 330).scale(scale).color(body));
p.part('base-foot-260-4-226-79999999999998', box(82, 82, 18, true).translate(260.4, 226.8, 9).scale(scale).color(accent));
p.part('rail-long--1', box(620, 18, 22, true).translate(0, -253.8, 765).scale(scale).color(accent));
p.part('mid-rail--1--1', box(620, 14, 18, true).translate(0, -253.8, 720).scale(scale).color(body));
p.part('mid-rail--1-1', box(620, 14, 18, true).translate(0, -253.8, 720).scale(scale).color(body));
p.part('rail-long-1', box(620, 18, 22, true).translate(0, 253.8, 765).scale(scale).color(accent));
p.part('mid-rail-1--1', box(620, 14, 18, true).translate(0, 253.8, 720).scale(scale).color(body));
p.part('mid-rail-1-1', box(620, 14, 18, true).translate(0, 253.8, 720).scale(scale).color(body));
p.part('access-step', box(150, 160, 34, true).translate(359.6, -178.2, 18).scale(scale).color(body));

return p.model();
