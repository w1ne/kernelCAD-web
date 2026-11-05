// SPDX-License-Identifier: CC0-1.0
// Low-profile orchard tractor with narrow wheel track, protective canopy and enclosed side panels.
meta({
  name: "orchard-tractor",
  license: 'CC0-1.0',
  title: "Orchard tractor",
  description: "Low-profile orchard tractor with narrow wheel track, protective canopy and enclosed side panels. Editable scale and painted steel, rubber, cab glass, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const rubberColor = param('rubberColor', '#292e2d', { label: 'Rubber' });
const glassColor = param('glassColor', '#6d9ca4', { label: 'Cab glass' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', glassColor: '#54757b', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', glassColor: '#79aeb4', steelColor: '#abb2ad' },
});
const slopedPrism = (width:number, depth:number, height:number) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const inset = width * 0.16;
  return path().moveTo(-halfWidth, -halfHeight)
    .lineTo(halfWidth, -halfHeight)
    .lineTo(halfWidth - inset, halfHeight)
    .lineTo(-halfWidth + inset, halfHeight)
    .close().extrude(depth).rotate([1, 0, 0], 90).translate(0, depth / 2, 0);
};
const p = assembly('orchard-tractor');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(96, 350, 12).rotate([0, 1, 0], 90).translate(-333.6, -266.6, 350), rubberColor);
add('rear-wheel--1-hub', cylinder(105.6, 119, 10).translate(-338.4, -266.6, 350), steelColor);
add('front-wheel--1', cylinder(76, 260, 12).rotate([0, 1, 0], 90).translate(298.6, -245.272, 260), rubberColor);
add('front-wheel--1-hub', cylinder(83.6, 88.4, 10).translate(294.8, -245.272, 260), steelColor);
add('rear-wheel-1', cylinder(96, 350, 12).rotate([0, 1, 0], 90).translate(-333.6, 266.6, 350), rubberColor);
add('rear-wheel-1-hub', cylinder(105.6, 119, 10).translate(-338.4, 266.6, 350), steelColor);
add('front-wheel-1', cylinder(76, 260, 12).rotate([0, 1, 0], 90).translate(298.6, 245.272, 260), rubberColor);
add('front-wheel-1-hub', cylinder(83.6, 88.4, 10).translate(294.8, 245.272, 260), steelColor);
add('main-chassis', box(765, 334.8, 150, true).translate(-40.8, 0, 341), paintedSteelColor);
add('engine-hood', slopedPrism(448.8, 291.4, 252).translate(224.4, 0, 492), paintedSteelColor);
add('front-grille', box(38, 235.6, 154, true).translate(459, 0, 453), steelColor);
add('rear-fender-left', box(285.6, 150, 36, true).translate(-285.6, -173.6, 620), paintedSteelColor);
add('rear-fender-right', box(285.6, 150, 36, true).translate(-285.6, 173.6, 620), paintedSteelColor);
add('cab-floor', box(326.4, 297.6, 45, true).translate(-204, 0, 482.5), paintedSteelColor);
add('cab-glazing-front', box(24, 279.744, 273, true).translate(-51, 0, 646.5), glassColor);
add('cab-glazing-rear', box(24, 279.744, 273, true).translate(-357, 0, 646.5), glassColor);
add('cab-pillar--1', box(326.4, 30, 315, true).translate(-204, -148.8, 687.5), paintedSteelColor);
add('cab-pillar-1', box(326.4, 30, 315, true).translate(-204, 148.8, 687.5), paintedSteelColor);
add('cab-roof', box(391.68, 357.12, 70, true).translate(-204, 0, 782), paintedSteelColor);
add('exhaust-stack', cylinder(262.5, 24, 8).translate(183.6, -86.8, 518), steelColor);
add('rear-hitch', box(190, 190, 150, true).translate(-473.3, 0, 236), steelColor);
add('front-weight-block', box(250, 279, 150, true).translate(528.8, 0, 406), steelColor);

return p.model();
