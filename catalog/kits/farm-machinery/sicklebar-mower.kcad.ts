// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly sicklebar mower scene prop, modeled from scratch.
meta({
  name: "sicklebar-mower",
  license: 'CC0-1.0',
  title: "Sicklebar mower",
  description: "Side-mounted sicklebar mower with long finger guard, reciprocating blade rail and support wheel. Knobs: overall scale, body color and accent color.",
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
const p = assembly('sicklebar-mower');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mower-deck', box(1558, 471.2, 257.6, true).translate(0, 0, 313.6), body);
add('deck-lip', box(1634, 42, 38, true).translate(0, -228, 187), accent);
add('sickle-bar', box(323, 638.4, 45, true).translate(817, 0, 190.5), accent);
add('guard-finger-0', box(180, 22, 26, true).translate(1026, -288.8, 164.2), body);
add('guard-finger-1', box(180, 22, 26, true).translate(1026, -236.291, 164.2), body);
add('guard-finger-2', box(180, 22, 26, true).translate(1026, -183.782, 164.2), body);
add('guard-finger-3', box(180, 22, 26, true).translate(1026, -131.273, 164.2), body);
add('guard-finger-4', box(180, 22, 26, true).translate(1026, -78.764, 164.2), body);
add('guard-finger-5', box(180, 22, 26, true).translate(1026, -26.255, 164.2), body);
add('guard-finger-6', box(180, 22, 26, true).translate(1026, 26.255, 164.2), body);
add('guard-finger-7', box(180, 22, 26, true).translate(1026, 78.764, 164.2), body);
add('guard-finger-8', box(180, 22, 26, true).translate(1026, 131.273, 164.2), body);
add('guard-finger-9', box(180, 22, 26, true).translate(1026, 183.782, 164.2), body);
add('guard-finger-10', box(180, 22, 26, true).translate(1026, 236.291, 164.2), body);
add('guard-finger-11', box(180, 22, 26, true).translate(1026, 288.8, 164.2), body);
add('deck-wheel--1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(-711, 167.2, 90), "#414848");
add('deck-wheel--1-hub', cylinder(59.4, 30.6, 10).translate(-713.7, 167.2, 90), accent);
add('deck-wheel-1', cylinder(54, 90, 12).rotate([0, 1, 0], 90).translate(657, 167.2, 90), "#414848");
add('deck-wheel-1-hub', cylinder(59.4, 30.6, 10).translate(654.3, 167.2, 90), accent);
add('three-point-tower', box(456, 60, 336, true).translate(0, 380, 476), accent);

return p.model();
