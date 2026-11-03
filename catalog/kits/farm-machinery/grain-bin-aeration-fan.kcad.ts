// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly grain-bin aeration fan unit scene prop, modeled from scratch.
meta({
  name: "grain-bin-aeration-fan",
  license: 'CC0-1.0',
  title: "Grain-bin aeration fan unit",
  description: "Low-profile aeration fan assembly with intake shroud, motor housing and transition duct. Knobs: overall scale, body color and accent color.",
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
const p = assembly('grain-bin-aeration-fan');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('fan-base', box(850, 720, 100, true).translate(0, 0, 50), accent);
add('fan-housing', box(680, 518.4, 459.2, true).translate(0, 0, 329.6), body);
add('fan-inlet', cylinder(55, 212.5, 12).translate(0, -216, 278.8), accent);
add('motor', box(255, 244.8, 180.4, true).translate(0, 180, 369), body);
add('air-slot-0', box(374, 16, 10, true).translate(0, -273.6, 135), accent);
add('air-slot-1', box(374, 16, 10, true).translate(0, -273.6, 171), accent);
add('air-slot-2', box(374, 16, 10, true).translate(0, -273.6, 207), accent);
add('air-slot-3', box(374, 16, 10, true).translate(0, -273.6, 243), accent);
add('air-slot-4', box(374, 16, 10, true).translate(0, -273.6, 279), accent);

return p.model();
