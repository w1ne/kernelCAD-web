// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tracked concrete buggy scene prop, modeled from scratch.
meta({
  name: "tracked-concrete-buggy",
  license: 'CC0-1.0',
  title: "Tracked concrete buggy",
  description: "Compact powered buggy with tracked undercarriage, skip hopper and operator handles. Knobs: overall scale, body color and accent color.",
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
const p = assembly('tracked-concrete-buggy');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('buggy-track--1-belt', box(629, 198.4, 155, true).translate(-34, -186, 77.5), body);
add('buggy-track--1-roller-0', cylinder(182.528, 68.2, 12).rotate([1, 0, 0], 90).translate(-260.44, -94.736, 71.3), "#40474b");
add('buggy-track--1-roller-0-hub--1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-260.44, -291.866, 71.3), accent);
add('buggy-track--1-roller-0-hub-1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-260.44, -80.134, 71.3), accent);
add('buggy-track--1-roller-1', cylinder(182.528, 68.2, 12).rotate([1, 0, 0], 90).translate(-34, -94.736, 71.3), "#40474b");
add('buggy-track--1-roller-1-hub--1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-34, -291.866, 71.3), accent);
add('buggy-track--1-roller-1-hub-1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-34, -80.134, 71.3), accent);
add('buggy-track--1-roller-2', cylinder(182.528, 68.2, 12).rotate([1, 0, 0], 90).translate(192.44, -94.736, 71.3), "#40474b");
add('buggy-track--1-roller-2-hub--1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(192.44, -291.866, 71.3), accent);
add('buggy-track--1-roller-2-hub-1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(192.44, -80.134, 71.3), accent);
add('buggy-track--1-idler-front', cylinder(186.496, 72.85, 12).rotate([1, 0, 0], 90).translate(223.89, -92.752, 74.4), "#40474b");
add('buggy-track--1-idler-front-hub--1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(223.89, -294.168, 74.4), accent);
add('buggy-track--1-idler-front-hub-1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(223.89, -77.832, 74.4), accent);
add('buggy-track--1-idler-rear', cylinder(186.496, 72.85, 12).rotate([1, 0, 0], 90).translate(-291.89, -92.752, 74.4), "#40474b");
add('buggy-track--1-idler-rear-hub--1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(-291.89, -294.168, 74.4), accent);
add('buggy-track--1-idler-rear-hub-1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(-291.89, -77.832, 74.4), accent);
add('buggy-track-1-belt', box(629, 198.4, 155, true).translate(-34, 186, 77.5), body);
add('buggy-track-1-roller-0', cylinder(182.528, 68.2, 12).rotate([1, 0, 0], 90).translate(-260.44, 277.264, 71.3), "#40474b");
add('buggy-track-1-roller-0-hub--1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-260.44, 80.134, 71.3), accent);
add('buggy-track-1-roller-0-hub-1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-260.44, 291.866, 71.3), accent);
add('buggy-track-1-roller-1', cylinder(182.528, 68.2, 12).rotate([1, 0, 0], 90).translate(-34, 277.264, 71.3), "#40474b");
add('buggy-track-1-roller-1-hub--1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-34, 80.134, 71.3), accent);
add('buggy-track-1-roller-1-hub-1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(-34, 291.866, 71.3), accent);
add('buggy-track-1-roller-2', cylinder(182.528, 68.2, 12).rotate([1, 0, 0], 90).translate(192.44, 277.264, 71.3), "#40474b");
add('buggy-track-1-roller-2-hub--1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(192.44, 80.134, 71.3), accent);
add('buggy-track-1-roller-2-hub-1', cylinder(29.204, 25.916, 10).rotate([1, 0, 0], 90).translate(192.44, 291.866, 71.3), accent);
add('buggy-track-1-idler-front', cylinder(186.496, 72.85, 12).rotate([1, 0, 0], 90).translate(223.89, 279.248, 74.4), "#40474b");
add('buggy-track-1-idler-front-hub--1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(223.89, 77.832, 74.4), accent);
add('buggy-track-1-idler-front-hub-1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(223.89, 294.168, 74.4), accent);
add('buggy-track-1-idler-rear', cylinder(186.496, 72.85, 12).rotate([1, 0, 0], 90).translate(-291.89, 279.248, 74.4), "#40474b");
add('buggy-track-1-idler-rear-hub--1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(-291.89, 77.832, 74.4), accent);
add('buggy-track-1-idler-rear-hub-1', cylinder(29.839, 27.683, 10).rotate([1, 0, 0], 90).translate(-291.89, 294.168, 74.4), accent);
add('buggy-frame', box(612, 359.6, 110, true).translate(0, 0, 225), body);
add('skip-floor', box(442, 372, 70, true).translate(0, 0, 315), accent);
add('skip-side--1', box(442, 45, 285, true).translate(0, -155, 452.5), body);
add('skip-side-1', box(442, 45, 285, true).translate(0, 155, 452.5), body);
add('operator-handle', box(55, 60, 340, true).translate(-408, 0, 440), accent);

return p.model();
