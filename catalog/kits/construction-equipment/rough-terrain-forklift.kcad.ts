// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rough-terrain forklift scene prop, modeled from scratch.
meta({
  name: "rough-terrain-forklift",
  license: 'CC0-1.0',
  title: "Rough-terrain forklift",
  description: "Site forklift with wide tires, overhead guard, tall mast and long fork tines. Knobs: overall scale, body color and accent color.",
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
const p = assembly('rough-terrain-forklift');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('forklift-wheel-0--1', cylinder(95, 170, 12).rotate([1, 0, 0], 90).translate(-324.8, -177.46, 170), "#40474b");
add('forklift-wheel-0--1-hub--1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(-324.8, -280.06, 170), accent);
add('forklift-wheel-0--1-hub-1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(-324.8, -169.86, 170), accent);
add('forklift-wheel-0-1', cylinder(95, 170, 12).rotate([1, 0, 0], 90).translate(-324.8, 272.46, 170), "#40474b");
add('forklift-wheel-0-1-hub--1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(-324.8, 169.86, 170), accent);
add('forklift-wheel-0-1-hub-1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(-324.8, 280.06, 170), accent);
add('forklift-wheel-1--1', cylinder(95, 170, 12).rotate([1, 0, 0], 90).translate(302.4, -177.46, 170), "#40474b");
add('forklift-wheel-1--1-hub--1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(302.4, -280.06, 170), accent);
add('forklift-wheel-1--1-hub-1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(302.4, -169.86, 170), accent);
add('forklift-wheel-1-1', cylinder(95, 170, 12).rotate([1, 0, 0], 90).translate(302.4, 272.46, 170), "#40474b");
add('forklift-wheel-1-1-hub--1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(302.4, 169.86, 170), accent);
add('forklift-wheel-1-1-hub-1', cylinder(15.2, 64.6, 10).rotate([1, 0, 0], 90).translate(302.4, 280.06, 170), accent);
add('forklift-frame', box(728, 418, 190, true).translate(0, 0, 325), body);
add('operator-cab', box(302.4, 319.2, 368, true).translate(-112, 0, 604), accent);
add('overhead-guard', box(403.2, 380, 36, true).translate(-112, 0, 806), body);
add('mast-inner', box(75, 357.2, 713, true).translate(425.6, 0, 506.5), accent);
add('mast-outer-left', box(58, 38, 828, true).translate(425.6, -167.2, 544), body);
add('mast-outer-right', box(58, 38, 828, true).translate(425.6, 167.2, 544), body);
add('fork-carriage', box(70, 471.2, 150, true).translate(481.6, 0, 305), accent);
add('fork-tine--1', box(340, 40, 46, true).translate(649.6, -152, 103), body);
add('fork-tine-1', box(340, 40, 46, true).translate(649.6, 152, 103), body);

return p.model();
