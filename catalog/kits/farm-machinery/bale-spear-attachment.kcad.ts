// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly bale spear attachment scene prop, modeled from scratch.
meta({
  name: "bale-spear-attachment",
  license: 'CC0-1.0',
  title: "Bale spear attachment",
  description: "Three-point bale frame with three long horizontal spears and a reinforced back plate. Knobs: overall scale, body color and accent color.",
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
const p = assembly('bale-spear-attachment');
const groundOffset = 60;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('mounting-frame', box(623.2, 100, 475.6, true).translate(0, 170, 297.8), body);
add('crossbar', box(760, 95, 80, true).translate(0, 115, 548.4), accent);
add('spear-socket-0', box(75, 100, 80, true).translate(-228, -80, 409), accent);
add('bale-spear-0', cylinder(450, 16, 8).rotate([1, 0, 0], 90).translate(-228, -260, 369), body);
add('spear-socket-1', box(75, 100, 80, true).translate(0, -80, 409), accent);
add('bale-spear-1', cylinder(450, 16, 8).rotate([1, 0, 0], 90).translate(0, -260, 369), body);
add('spear-socket-2', box(75, 100, 80, true).translate(228, -80, 409), accent);
add('bale-spear-2', cylinder(450, 16, 8).rotate([1, 0, 0], 90).translate(228, -260, 369), body);

return p.model();
