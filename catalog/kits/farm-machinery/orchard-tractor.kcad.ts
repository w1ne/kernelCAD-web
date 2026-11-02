// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly orchard tractor scene prop, modeled from scratch.
meta({
  name: "orchard-tractor",
  license: 'CC0-1.0',
  title: "Orchard tractor",
  description: "Low-profile orchard tractor with narrow wheel track, protective canopy and enclosed side panels. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('orchard-tractor');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(96, 350, 12).rotate([0, 1, 0], 90).translate(-333.6, -266.6, 350), "#414848");
add('rear-wheel--1-hub', cylinder(105.6, 119, 10).translate(-338.4, -266.6, 350), accent);
add('front-wheel--1', cylinder(76, 260, 12).rotate([0, 1, 0], 90).translate(298.6, -245.272, 260), "#414848");
add('front-wheel--1-hub', cylinder(83.6, 88.4, 10).translate(294.8, -245.272, 260), accent);
add('rear-wheel-1', cylinder(96, 350, 12).rotate([0, 1, 0], 90).translate(-333.6, 266.6, 350), "#414848");
add('rear-wheel-1-hub', cylinder(105.6, 119, 10).translate(-338.4, 266.6, 350), accent);
add('front-wheel-1', cylinder(76, 260, 12).rotate([0, 1, 0], 90).translate(298.6, 245.272, 260), "#414848");
add('front-wheel-1-hub', cylinder(83.6, 88.4, 10).translate(294.8, 245.272, 260), accent);
add('main-chassis', box(765, 334.8, 150, true).translate(-40.8, 0, 341), body);
add('engine-hood', box(448.8, 291.4, 252, true).translate(224.4, 0, 492), accent);
add('front-grille', box(38, 235.6, 154, true).translate(459, 0, 453), body);
add('rear-fender-left', box(285.6, 150, 36, true).translate(-285.6, -173.6, 620), accent);
add('rear-fender-right', box(285.6, 150, 36, true).translate(-285.6, 173.6, 620), accent);
add('cab-floor', box(326.4, 297.6, 45, true).translate(-204, 0, 482.5), body);
add('cab-glazing-front', box(24, 279.744, 273, true).translate(-51, 0, 646.5), accent);
add('cab-glazing-rear', box(24, 279.744, 273, true).translate(-357, 0, 646.5), accent);
add('cab-pillar--1', box(326.4, 30, 315, true).translate(-204, -148.8, 687.5), body);
add('cab-pillar-1', box(326.4, 30, 315, true).translate(-204, 148.8, 687.5), body);
add('cab-roof', box(391.68, 357.12, 70, true).translate(-204, 0, 782), accent);
add('exhaust-stack', cylinder(262.5, 24, 8).translate(183.6, -86.8, 518), body);
add('rear-hitch', box(190, 190, 150, true).translate(-520.2, 0, 115), accent);
add('front-weight-block', box(210, 279, 80, true).translate(510, 0, 60), body);

return p.model();
