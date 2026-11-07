// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly towable site light tower scene prop, modeled from scratch.
meta({
  name: "towable-light-tower",
  license: 'CC0-1.0',
  title: "Towable site light tower",
  description: "Mobile lighting mast with four floodlight heads, stabilizer legs and road trailer. Knobs: overall scale, body color and accent color.",
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
const p = assembly('towable-light-tower');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('skid-base', box(945, 619.2, 65, true).translate(0, 0, 32.5), body);
add('tower-base', box(399, 259.2, 105, true).translate(0, 0, 117.5), accent);
add('telescoping-mast', cylinder(1599, 38, 8).translate(0, 0, 170), body);
add('light-bar', box(756, 46, 46, true).translate(0, 0, 1888.5), accent);
add('floodlight-0', box(86, 62, 75, true).translate(-294, 0, 1938), body);
add('floodlight-1', box(86, 62, 75, true).translate(-94.5, 0, 1938), body);
add('floodlight-2', box(86, 62, 75, true).translate(105, 0, 1938), body);
add('floodlight-3', box(86, 62, 75, true).translate(304.5, 0, 1938), body);
add('stabilizer--1', box(1207.5, 40, 40, true).translate(0, -446.4, 20), accent);
add('stabilizer-1', box(1207.5, 40, 40, true).translate(0, 446.4, 20), accent);

return p.model();
