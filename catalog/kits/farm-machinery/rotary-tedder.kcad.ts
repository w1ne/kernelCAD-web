// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rotary hay tedder scene prop, modeled from scratch.
meta({
  name: "rotary-tedder",
  license: 'CC0-1.0',
  title: "Rotary hay tedder",
  description: "Four-rotor hay tedder with radial tine arms, drawbar and folding transport frame. Knobs: overall scale, body color and accent color.",
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
const p = assembly('rotary-tedder');
const groundOffset = 120;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('hay-frame', box(1848, 85, 78, true).translate(0, 116, 383.4), accent);
add('drawbar', box(95, 725, 56, true).translate(0, 623.5, 438), body);
add('rotor-hub-0', cylinder(42, 78, 10).translate(-836, 0, 120), body);
add('tedder-arm-0-0', box(34, 280, 20, true).translate(-973.5, 0, 180), accent);
add('tedder-arm-0-1', box(34, 280, 20, true).translate(-918.5, 0, 180), accent);
add('tedder-arm-0-2', box(34, 280, 20, true).translate(-863.5, 0, 180), accent);
add('tedder-arm-0-3', box(34, 280, 20, true).translate(-808.5, 0, 180), accent);
add('tedder-arm-0-4', box(34, 280, 20, true).translate(-753.5, 0, 180), accent);
add('tedder-arm-0-5', box(34, 280, 20, true).translate(-698.5, 0, 180), accent);
add('rotor-hub-1', cylinder(42, 78, 10).translate(-278.667, 0, 120), body);
add('tedder-arm-1-0', box(34, 280, 20, true).translate(-416.167, 0, 180), accent);
add('tedder-arm-1-1', box(34, 280, 20, true).translate(-361.167, 0, 180), accent);
add('tedder-arm-1-2', box(34, 280, 20, true).translate(-306.167, 0, 180), accent);
add('tedder-arm-1-3', box(34, 280, 20, true).translate(-251.167, 0, 180), accent);
add('tedder-arm-1-4', box(34, 280, 20, true).translate(-196.167, 0, 180), accent);
add('tedder-arm-1-5', box(34, 280, 20, true).translate(-141.167, 0, 180), accent);
add('rotor-hub-2', cylinder(42, 78, 10).translate(278.667, 0, 120), body);
add('tedder-arm-2-0', box(34, 280, 20, true).translate(141.167, 0, 180), accent);
add('tedder-arm-2-1', box(34, 280, 20, true).translate(196.167, 0, 180), accent);
add('tedder-arm-2-2', box(34, 280, 20, true).translate(251.167, 0, 180), accent);
add('tedder-arm-2-3', box(34, 280, 20, true).translate(306.167, 0, 180), accent);
add('tedder-arm-2-4', box(34, 280, 20, true).translate(361.167, 0, 180), accent);
add('tedder-arm-2-5', box(34, 280, 20, true).translate(416.167, 0, 180), accent);
add('rotor-hub-3', cylinder(42, 78, 10).translate(836, 0, 120), body);
add('tedder-arm-3-0', box(34, 280, 20, true).translate(698.5, 0, 180), accent);
add('tedder-arm-3-1', box(34, 280, 20, true).translate(753.5, 0, 180), accent);
add('tedder-arm-3-2', box(34, 280, 20, true).translate(808.5, 0, 180), accent);
add('tedder-arm-3-3', box(34, 280, 20, true).translate(863.5, 0, 180), accent);
add('tedder-arm-3-4', box(34, 280, 20, true).translate(918.5, 0, 180), accent);
add('tedder-arm-3-5', box(34, 280, 20, true).translate(973.5, 0, 180), accent);

return p.model();
