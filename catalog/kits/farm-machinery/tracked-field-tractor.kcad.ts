// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tracked field tractor scene prop, modeled from scratch.
meta({
  name: "tracked-field-tractor",
  license: 'CC0-1.0',
  title: "Tracked field tractor",
  description: "Heavy field tractor with paired rubber-track frames, broad engine housing and raised cab. Knobs: overall scale, body color and accent color.",
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
const p = assembly('tracked-field-tractor');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('rear-wheel--1', cylinder(130, 450, 12).rotate([0, 1, 0], 90).translate(-434.6, -387, 450), "#414848");
add('rear-wheel--1-hub', cylinder(143, 153, 10).translate(-441.1, -387, 450), accent);
add('front-wheel--1', cylinder(100, 420, 12).rotate([0, 1, 0], 90).translate(385.6, -387, 420), "#414848");
add('front-wheel--1-hub', cylinder(110, 142.8, 10).translate(380.6, -387, 420), accent);
add('track-frame--1', box(712.8, 150, 787.5, true).translate(-369.6, -387, 403.75), body);
add('track-roller--1-0', cylinder(38, 81, 8).translate(-646.8, -441.18, 20), accent);
add('track-roller--1-1', cylinder(38, 81, 8).translate(-535.92, -441.18, 20), accent);
add('track-roller--1-2', cylinder(38, 81, 8).translate(-425.04, -441.18, 20), accent);
add('track-roller--1-3', cylinder(38, 81, 8).translate(-314.16, -441.18, 20), accent);
add('track-roller--1-4', cylinder(38, 81, 8).translate(-203.28, -441.18, 20), accent);
add('track-roller--1-5', cylinder(38, 81, 8).translate(-92.4, -441.18, 20), accent);
add('rear-wheel-1', cylinder(130, 450, 12).rotate([0, 1, 0], 90).translate(-434.6, 387, 450), "#414848");
add('rear-wheel-1-hub', cylinder(143, 153, 10).translate(-441.1, 387, 450), accent);
add('front-wheel-1', cylinder(100, 420, 12).rotate([0, 1, 0], 90).translate(385.6, 387, 420), "#414848");
add('front-wheel-1-hub', cylinder(110, 142.8, 10).translate(380.6, 387, 420), accent);
add('track-frame-1', box(712.8, 150, 787.5, true).translate(-369.6, 387, 403.75), body);
add('track-roller-1-0', cylinder(38, 81, 8).translate(-646.8, 441.18, 20), accent);
add('track-roller-1-1', cylinder(38, 81, 8).translate(-535.92, 441.18, 20), accent);
add('track-roller-1-2', cylinder(38, 81, 8).translate(-425.04, 441.18, 20), accent);
add('track-roller-1-3', cylinder(38, 81, 8).translate(-314.16, 441.18, 20), accent);
add('track-roller-1-4', cylinder(38, 81, 8).translate(-203.28, 441.18, 20), accent);
add('track-roller-1-5', cylinder(38, 81, 8).translate(-92.4, 441.18, 20), accent);
add('main-chassis', box(990, 486, 150, true).translate(-52.8, 0, 417), body);
add('engine-hood', box(580.8, 423, 324, true).translate(290.4, 0, 604), accent);
add('front-grille', box(38, 342, 198, true).translate(594, 0, 551), body);
add('rear-fender-left', box(369.6, 150, 36, true).translate(-369.6, -252, 792), accent);
add('rear-fender-right', box(369.6, 150, 36, true).translate(-369.6, 252, 792), accent);
add('cab-floor', box(422.4, 432, 45, true).translate(-264, 0, 562.5), body);
add('cab-glazing-front', box(24, 406.08, 351, true).translate(-66, 0, 765.5), accent);
add('cab-glazing-rear', box(24, 406.08, 351, true).translate(-462, 0, 765.5), accent);
add('cab-pillar--1', box(422.4, 30, 405, true).translate(-264, -216, 812.5), body);
add('cab-pillar-1', box(422.4, 30, 405, true).translate(-264, 216, 812.5), body);
add('cab-roof', box(506.88, 518.4, 70, true).translate(-264, 0, 944), accent);
add('exhaust-stack', cylinder(337.5, 24, 8).translate(237.6, -126, 666), body);
add('rear-hitch', box(190, 190, 150, true).translate(-673.2, 0, 115), accent);
add('front-weight-block', box(210, 405, 80, true).translate(660, 0, 60), body);

return p.model();
