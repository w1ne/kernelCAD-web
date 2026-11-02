// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly bridge crane scene prop, modeled from scratch.
meta({
  name: 'bridge-crane',
  license: 'CC0-1.0',
  title: 'Bridge crane',
  description: 'Overhead bridge crane with twin runway girders, end trucks, a moving trolley and hanging hook. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#758087', { label: 'Body color' });
const accent = param('accent', '#e5ac42', { label: 'Accent color' });
const p = assembly('bridge-crane');
p.part('base-rail-left', box(1180, 42, 34, true).translate(0, -334.4, 17).scale(scale).color(accent));
p.part('base-rail-right', box(1180, 42, 34, true).translate(0, 334.4, 17).scale(scale).color(accent));
p.part('column--1', box(42, 42, 717.6, true).translate(-495.6, -319.2, 358.8).scale(scale).color(body));
p.part('runway-girder--1', box(1274.4, 44, 55, true).translate(0, -319.2, 745.2).scale(scale).color(accent));
p.part('column-1', box(42, 42, 717.6, true).translate(-495.6, 319.2, 358.8).scale(scale).color(body));
p.part('runway-girder-1', box(1274.4, 44, 55, true).translate(0, 319.2, 745.2).scale(scale).color(accent));
p.part('bridge-beam', box(58, 790.4, 72, true).translate(0, 0, 791.2).scale(scale).color(body));
p.part('trolley', box(220, 190, 80, true).translate(0, 0, 837.2).scale(scale).color(accent));
p.part('chain', cylinder(312.8, 11, 8).translate(0, 0, 515.2).scale(scale).color(body));
p.part('hook-block', box(46, 50, 70, true).translate(0, 0, 165.6).scale(scale).color(accent));
p.part('hook', box(42, 24, 38, true).translate(20, 0, 101.2).scale(scale).color(body));

return p.model();
