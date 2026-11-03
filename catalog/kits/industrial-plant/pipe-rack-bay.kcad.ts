// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly pipe rack bay scene prop, modeled from scratch.
meta({
  name: 'pipe-rack-bay',
  license: 'CC0-1.0',
  title: 'Pipe rack bay',
  description: 'Pipe rack bay with cross-braced uprights, a raised service beam and three parallel utility lines. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#707d84', { label: 'Body color' });
const accent = param('accent', '#e2a844', { label: 'Accent color' });
const p = assembly('pipe-rack-bay');
p.part('support-column--1', box(48, 48, 740, true).translate(0, -226.8, 370).scale(scale).color(body));
p.part('baseplate--1', box(125, 125, 22, true).translate(0, -226.8, 11).scale(scale).color(accent));
p.part('crossbeam--1', box(880, 44, 46, true).translate(0, -226.8, 606.8).scale(scale).color(accent));
p.part('brace--1', box(651.2, 28, 25, true).rotate([0, 1, 0], -12).translate(0, -226.8, 318.2).scale(scale).color(body));
p.part('support-column-1', box(48, 48, 740, true).translate(0, 226.8, 370).scale(scale).color(body));
p.part('baseplate-1', box(125, 125, 22, true).translate(0, 226.8, 11).scale(scale).color(accent));
p.part('crossbeam-1', box(880, 44, 46, true).translate(0, 226.8, 606.8).scale(scale).color(accent));
p.part('brace-1', box(651.2, 28, 25, true).rotate([0, 1, 0], 12).translate(0, 226.8, 318.2).scale(scale).color(body));
p.part('pipe-run-0', cylinder(932.8, 34, 10).rotate([0, 1, 0], 90).translate(-466.4, -151.2, 636.4).scale(scale).color(body));
p.part('pipe-flange-0', cylinder(18, 55, 10).rotate([0, 1, 0], 90).translate(334.2, -151.2, 636.4).scale(scale).color(accent));
p.part('pipe-run-1', cylinder(932.8, 42, 10).rotate([0, 1, 0], 90).translate(-466.4, 0, 636.4).scale(scale).color(accent));
p.part('pipe-flange-1', cylinder(18, 55, 10).rotate([0, 1, 0], 90).translate(334.2, 0, 636.4).scale(scale).color(accent));
p.part('pipe-run-2', cylinder(932.8, 50, 10).rotate([0, 1, 0], 90).translate(-466.4, 151.2, 636.4).scale(scale).color(body));
p.part('pipe-flange-2', cylinder(18, 55, 10).rotate([0, 1, 0], 90).translate(334.2, 151.2, 636.4).scale(scale).color(accent));

return p.model();
