// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly masonry mortar mixer scene prop, modeled from scratch.
meta({
  name: "masonry-mixer",
  license: 'CC0-1.0',
  title: "Masonry mortar mixer",
  description: "Portable drum mixer with reinforced frame, tilting cradle and transport wheels. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('masonry-mixer');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('mixer-wheel--1', cylinder(76, 150, 12).rotate([1, 0, 0], 90).translate(-262.4, -250.6, 150), "#40474b");
add('mixer-wheel--1-hub--1', cylinder(12.16, 57, 10).rotate([1, 0, 0], 90).translate(-262.4, -332.68, 150), accent);
add('mixer-wheel--1-hub-1', cylinder(12.16, 57, 10).rotate([1, 0, 0], 90).translate(-262.4, -244.52, 150), accent);
add('mixer-wheel-1', cylinder(76, 150, 12).rotate([1, 0, 0], 90).translate(-262.4, 326.6, 150), "#40474b");
add('mixer-wheel-1-hub--1', cylinder(12.16, 57, 10).rotate([1, 0, 0], 90).translate(-262.4, 244.52, 150), accent);
add('mixer-wheel-1-hub-1', cylinder(12.16, 57, 10).rotate([1, 0, 0], 90).translate(-262.4, 332.68, 150), accent);
add('mixer-frame', box(672.4, 325.6, 90, true).translate(0, 0, 225), body);
add('mixing-drum', cylinder(460, 287, 12).translate(0, 0, 437.1), accent);
add('tilting-cradle', box(508.4, 384.8, 70, true).translate(0, 0, 305), body);
add('motor-housing', box(246, 251.6, 250, true).translate(262.4, 0, 345), accent);
add('push-handle', box(45, 45, 390.6, true).translate(-377.2, 0, 420.3), body);

return p.model();
