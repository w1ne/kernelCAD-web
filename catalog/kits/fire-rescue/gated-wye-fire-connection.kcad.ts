// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly gated wye fire connection scene prop, modeled from scratch.
meta({
  name: "gated-wye-fire-connection",
  license: 'CC0-1.0',
  title: "Gated wye fire connection",
  description: "Branching hose fitting with two gated outlets and control handles. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("gated-wye-fire-connection");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("branch-body", box(250, 170, 100, true).translate(0, 0, 50), body);
add("inlet", cylinder(150, 27.5, 10).rotate([0, 1, 0], 90).translate(145, 0, 50), accent);
add("outlet--1", box(200, 55, 55, true).rotate([0, 0, 1], -35).translate(-120, -125, 107.5), accent);
add("gate-wheel--1", cylinder(22, 48, 8).translate(-205, -155, 135), body);
add("gate-stem--1", box(24, 24, 55, true).translate(-205, -155, 115.5), accent);
add("outlet-1", box(200, 55, 55, true).rotate([0, 0, 1], 35).translate(-120, 125, 107.5), accent);
add("gate-wheel-1", cylinder(22, 48, 8).translate(-205, 155, 135), body);
add("gate-stem-1", box(24, 24, 55, true).translate(-205, 155, 115.5), accent);

return p.model();
