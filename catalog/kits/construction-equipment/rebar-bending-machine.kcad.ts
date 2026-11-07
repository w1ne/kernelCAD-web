// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rebar bending machine scene prop, modeled from scratch.
meta({
  name: "rebar-bending-machine",
  license: 'CC0-1.0',
  title: "Rebar bending machine",
  description: "Portable rebar bender with flat work table, rotary pin plate and control pedal. Knobs: overall scale, body color and accent color.",
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
const p = assembly('rebar-bending-machine');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('machine-base', box(608, 425.6, 110, true).translate(0, 0, 55), body);
add('work-table', box(760, 436.8, 80, true).translate(0, 0, 150), accent);
add('motor-case', box(190, 268.8, 176.8, true).translate(-167.2, 0, 278.4), body);
add('bending-disc', cylinder(72, 134.4, 10).translate(182.4, 0, 190), accent);
add('bend-pin-0', cylinder(48, 18, 8).translate(76, 0, 260), body);
add('bend-pin-1', cylinder(48, 18, 8).translate(129.2, 0, 260), body);
add('bend-pin-2', cylinder(48, 18, 8).translate(182.4, 0, 260), body);
add('bend-pin-3', cylinder(48, 18, 8).translate(235.6, 0, 260), body);
add('bend-pin-4', cylinder(48, 18, 8).translate(288.8, 0, 260), body);

return p.model();
