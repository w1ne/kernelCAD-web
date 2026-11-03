// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly drywall panel lift scene prop, modeled from scratch.
meta({
  name: "drywall-panel-lift",
  license: 'CC0-1.0',
  title: "Drywall panel lift",
  description: "Foldable panel lift with telescoping mast, tilting cradle, tripod legs and casters. Knobs: overall scale, body color and accent color.",
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
const p = assembly('drywall-panel-lift');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-crossbar', box(800, 70, 52, true).translate(0, 0, 136), body);
add('caster--1', cylinder(52, 78, 12).rotate([1, 0, 0], 90).translate(-304, 26, 78), "#40474b");
add('caster--1-hub--1', cylinder(8.32, 29.64, 10).rotate([1, 0, 0], 90).translate(-304, -30.16, 78), accent);
add('caster--1-hub-1', cylinder(8.32, 29.64, 10).rotate([1, 0, 0], 90).translate(-304, 30.16, 78), accent);
add('caster-1', cylinder(52, 78, 12).rotate([1, 0, 0], 90).translate(304, 26, 78), "#40474b");
add('caster-1-hub--1', cylinder(8.32, 29.64, 10).rotate([1, 0, 0], 90).translate(304, -30.16, 78), accent);
add('caster-1-hub-1', cylinder(8.32, 29.64, 10).rotate([1, 0, 0], 90).translate(304, 30.16, 78), accent);
add('mast', cylinder(1023, 52, 8).translate(0, 0, 160), accent);
add('mast-collar', box(135, 135, 58, true).translate(0, 0, 821), body);
add('tilt-cradle', box(656, 374.4, 60, true).translate(0, 0, 1350), accent);
add('cradle-crossbar', box(55, 736, 48, true).translate(0, 0, 1509), body);
add('base-leg-left', box(60, 648, 65, true).translate(-288, 0, 32.5), accent);
add('base-leg-right', box(60, 648, 65, true).translate(288, 0, 32.5), accent);

return p.model();
