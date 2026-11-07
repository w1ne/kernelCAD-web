// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rebar straightener and coil stand scene prop, modeled from scratch.
meta({
  name: "rebar-straightener-coil",
  license: 'CC0-1.0',
  title: "Rebar straightener and coil stand",
  description: "Portable rebar straightening unit with feed rollers, guide wheels and coil stand. Knobs: overall scale, body color and accent color.",
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
const p = assembly('rebar-straightener-coil');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('machine-base', box(840, 456, 110, true).translate(0, 0, 55), body);
add('work-table', box(1050, 468, 80, true).translate(0, 0, 150), accent);
add('motor-case', box(262.5, 288, 258.4, true).translate(-231, 0, 319.2), body);
add('feed-roller-0', cylinder(336, 48, 8).rotate([1, 0, 0], 90).translate(-189, 168, 418), accent);
add('feed-roller-1', cylinder(336, 48, 8).rotate([1, 0, 0], 90).translate(-63, 168, 418), accent);
add('feed-roller-2', cylinder(336, 48, 8).rotate([1, 0, 0], 90).translate(63, 168, 418), accent);
add('feed-roller-3', cylinder(336, 48, 8).rotate([1, 0, 0], 90).translate(189, 168, 418), accent);
add('coil-hub', cylinder(312, 140, 10).rotate([1, 0, 0], 90).translate(-441, 156, 380), body);
add('coil-support', box(45, 372, 380, true).translate(-441, 0, 190), accent);

return p.model();
