// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly reinforcing bar cage scene prop, modeled from scratch.
meta({
  name: "rebar-cage",
  license: 'CC0-1.0',
  title: "Reinforcing bar cage",
  description: "Short reinforcing cage assembled from longitudinal bars and repeating ties. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('rebar-cage');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('assembly-skid', box(1260, 558, 35, true).translate(0, 0, 17.5), body);
add('support-saddle--1', box(1176, 35, 111.6, true).translate(0, -235.6, 90.8), accent);
add('support-saddle-1', box(1176, 35, 111.6, true).translate(0, 235.6, 90.8), accent);
add('longitudinal-bar--1-0', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, -260.4, 372), body);
add('longitudinal-bar--1-1', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, -156.24, 372), body);
add('longitudinal-bar--1-2', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, -52.08, 372), body);
add('longitudinal-bar--1-3', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, 52.08, 372), body);
add('longitudinal-bar--1-4', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, 156.24, 372), body);
add('longitudinal-bar--1-5', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, 260.4, 372), body);
add('longitudinal-bar-1-0', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, -260.4, 372), body);
add('longitudinal-bar-1-1', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, -156.24, 372), body);
add('longitudinal-bar-1-2', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, -52.08, 372), body);
add('longitudinal-bar-1-3', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, 52.08, 372), body);
add('longitudinal-bar-1-4', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, 156.24, 372), body);
add('longitudinal-bar-1-5', cylinder(1148, 18, 6).rotate([0, 1, 0], 90).translate(-574, 260.4, 372), body);
add('tie-ring-0', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(-532, 223.2, 372), accent);
add('tie-ring-1', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(-380, 223.2, 372), accent);
add('tie-ring-2', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(-228, 223.2, 372), accent);
add('tie-ring-3', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(-76, 223.2, 372), accent);
add('tie-ring-4', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(76, 223.2, 372), accent);
add('tie-ring-5', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(228, 223.2, 372), accent);
add('tie-ring-6', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(380, 223.2, 372), accent);
add('tie-ring-7', cylinder(446.4, 16, 8).rotate([1, 0, 0], 90).translate(532, 223.2, 372), accent);

return p.model();
