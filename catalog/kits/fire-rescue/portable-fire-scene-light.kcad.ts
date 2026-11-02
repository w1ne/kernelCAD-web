// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable fire scene light scene prop, modeled from scratch.
meta({
  name: "portable-fire-scene-light",
  license: 'CC0-1.0',
  title: "Portable fire scene light",
  description: "Tripod-mounted dual scene lamps with adjustable heads and cable-ready base. Knobs: overall scale, body color and accent color.",
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
const p = assembly("portable-fire-scene-light");
const groundOffset = -20;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tripod-leg--1", box(44, 44, 900, true).rotate([0, 1, 0], -9).translate(-135, 0, 920), body);
add("lamp-head--1", box(220, 100, 145, true).translate(-140, 0, 1062.5), accent);
add("lamp-face--1", box(160, 20, 100, true).translate(-140, -58, 1040), body);
add("tripod-leg-1", box(44, 44, 900, true).rotate([0, 1, 0], 9).translate(135, 0, 920), body);
add("lamp-head-1", box(220, 100, 145, true).translate(140, 0, 1062.5), accent);
add("lamp-face-1", box(160, 20, 100, true).translate(140, -58, 1040), body);
add("mast-collar", cylinder(80, 85, 8).translate(0, 0, 820), accent);
add("ground-foot", box(550, 410, 40, true).translate(0, 0, 40), body);

return p.model();
