// SPDX-License-Identifier: CC0-1.0
// Tripod-mounted dual scene lamps with adjustable heads and cable-ready base. Material controls: guard and blade metal, lamp lens, rubber feet and grips, fan frame paint; weathered and highVisibility presets.
meta({
  name: "portable-fire-scene-light",
  license: 'CC0-1.0',
  title: "Portable fire scene light",
  description: "Tripod-mounted dual scene lamps with adjustable heads and cable-ready base. Material controls: guard and blade metal, lamp lens, rubber feet and grips, fan frame paint; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const guardMetalColor = param('guardMetalColor', '#89969b', { label: 'Guard and blade metal' });
const lensColor = param('lensColor', '#d4e4dc', { label: 'Lamp lens' });
const rubberFootColor = param('rubberFootColor', '#303539', { label: 'Rubber feet and grips' });
const fanFramePaintColor = param('fanFramePaintColor', '#d99029', { label: 'Fan frame paint' });
presets({
  weathered: { guardMetalColor: '#6f797c', lensColor: '#b5c4bb', rubberFootColor: '#41423f', fanFramePaintColor: '#916533' },
  highVisibility: { guardMetalColor: '#b9c0b6', lensColor: '#f2e5aa', rubberFootColor: '#303539', fanFramePaintColor: '#e9b632' },
});
const p = assembly("portable-fire-scene-light");
const groundOffset = -20;
const add = (name, shape, finish = fanFramePaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tripod-leg--1", box(44, 44, 900, true).rotateY(-9).translate(-135, 0, 920), guardMetalColor);
add("lamp-head--1", box(220, 100, 145, true).translate(-140, 0, 1062.5), lensColor);
add("lamp-face--1", box(160, 20, 100, true).translate(-140, -58, 1040), lensColor);
add("tripod-leg-1", box(44, 44, 900, true).rotateY(9).translate(135, 0, 920), guardMetalColor);
add("lamp-head-1", box(220, 100, 145, true).translate(140, 0, 1062.5), lensColor);
add("lamp-face-1", box(160, 20, 100, true).translate(140, -58, 1040), lensColor);
add("mast-collar", cylinder(80, 85, 8).translate(0, 0, 820), guardMetalColor);
add("ground-foot", box(550, 410, 40, true).translate(0, 0, 40), rubberFootColor);

return p.model();
