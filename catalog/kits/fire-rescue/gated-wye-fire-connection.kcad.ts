// SPDX-License-Identifier: CC0-1.0
// Branching hose fitting with two gated outlets and control handles. Material controls: tool coating, safety marking, steel and aluminum; weathered and highVisibility presets.
meta({
  name: "gated-wye-fire-connection",
  license: 'CC0-1.0',
  title: "Gated wye fire connection",
  description: "Branching hose fitting with two gated outlets and control handles. Material controls: tool coating, safety marking, steel and aluminum; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking' });
const steelColor = param('steelColor', '#aab5b9', { label: 'Steel and aluminum' });
presets({
  weathered: { toolCoatingColor: '#956438', safetyMarkingColor: '#874e49', steelColor: '#858f92' },
  highVisibility: { toolCoatingColor: '#e8b331', safetyMarkingColor: '#f0db56', steelColor: '#c3c6b6' },
});
const p = assembly("gated-wye-fire-connection");
const groundOffset = 0;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("branch-body", box(250, 170, 100, true).translate(0, 0, 50), toolCoatingColor);
add("inlet", cylinder(150, 27.5, 10).rotateY(90).translate(145, 0, 50), safetyMarkingColor);
add("outlet--1", box(200, 55, 55, true).rotateZ(-35).translate(-120, -125, 107.5), safetyMarkingColor);
add("gate-wheel--1", cylinder(22, 48, 8).translate(-205, -155, 135), toolCoatingColor);
add("gate-stem--1", box(24, 24, 55, true).translate(-205, -155, 115.5), steelColor);
add("outlet-1", box(200, 55, 55, true).rotateZ(35).translate(-120, 125, 107.5), safetyMarkingColor);
add("gate-wheel-1", cylinder(22, 48, 8).translate(-205, 155, 135), toolCoatingColor);
add("gate-stem-1", box(24, 24, 55, true).translate(-205, 155, 115.5), steelColor);

return p.model();
