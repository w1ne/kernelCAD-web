// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly baghouse dust collector scene prop, modeled from scratch.
meta({
  name: 'baghouse-dust-collector',
  license: 'CC0-1.0',
  title: 'Baghouse dust collector',
  description: 'Baghouse collector with filter tubes, a hopper bottom, service platform and induced-draft fan. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#748088', { label: 'Body color' });
const accent = param('accent', '#dfa344', { label: 'Accent color' });
const p = assembly('baghouse-dust-collector');
p.part('collector-plenum', box(620, 360, 478.4, true).translate(0, 0, 598).scale(scale).color(body));
p.part('access-roof', box(669.6, 388.8, 28, true).translate(0, 0, 855.6).scale(scale).color(accent));
p.part('filter-bag-0', cylinder(257.6, 36, 8).translate(-210.8, -100.8, 837.2).scale(scale).color(accent));
p.part('filter-bag-1', cylinder(257.6, 36, 8).translate(0, -100.8, 837.2).scale(scale).color(accent));
p.part('filter-bag-2', cylinder(257.6, 36, 8).translate(210.8, -100.8, 837.2).scale(scale).color(accent));
p.part('filter-bag-3', cylinder(257.6, 36, 8).translate(-210.8, 100.8, 837.2).scale(scale).color(accent));
p.part('filter-bag-4', cylinder(257.6, 36, 8).translate(0, 100.8, 837.2).scale(scale).color(accent));
p.part('filter-bag-5', cylinder(257.6, 36, 8).translate(210.8, 100.8, 837.2).scale(scale).color(accent));
p.part('support--1', box(36, 36, 184, true).translate(-229.4, 0, 92).scale(scale).color(accent));
p.part('support-1', box(36, 36, 184, true).translate(229.4, 0, 92).scale(scale).color(accent));
p.part('hopper', cylinder(185, 173.6, 10).translate(0, 0, 50).scale(scale).color(body));
p.part('fan-duct', cylinder(220, 52, 10).rotate([0, 1, 0], 90).translate(237.2, 0, 671.6).scale(scale).color(accent));
p.part('fan-motor', cylinder(180, 42, 10).rotate([0, 1, 0], 90).translate(362.6, 0, 671.6).scale(scale).color(body));
p.part('service-walkway', box(775, 65, 22, true).translate(0, -208.8, 441.6).scale(scale).color(accent));
p.part('walkway-rail', box(775, 14, 62, true).translate(0, -237.6, 478.4).scale(scale).color(body));

return p.model();
