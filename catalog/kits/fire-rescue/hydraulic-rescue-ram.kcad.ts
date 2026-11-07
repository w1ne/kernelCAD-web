// SPDX-License-Identifier: CC0-1.0
// Telescoping rescue ram with piston body, end plates and hose connection. Material controls: tool coating, steel and aluminum, safety marking; weathered and highVisibility presets.
meta({
  name: "hydraulic-rescue-ram",
  license: 'CC0-1.0',
  title: "Hydraulic rescue ram",
  description: "Telescoping rescue ram with piston body, end plates and hose connection. Material controls: tool coating, steel and aluminum, safety marking; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
const steelColor = param('steelColor', '#aab5b9', { label: 'Steel and aluminum' });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking' });
presets({
  weathered: { toolCoatingColor: '#956438', steelColor: '#858f92', safetyMarkingColor: '#874e49' },
  highVisibility: { toolCoatingColor: '#e8b331', steelColor: '#c3c6b6', safetyMarkingColor: '#f0db56' },
});
const p = assembly("hydraulic-rescue-ram");
const groundOffset = -30;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tool-body", box(352.8, 110, 125, true).translate(-67.2, 0, 152.5), toolCoatingColor);
add("rear-handle", box(90, 230, 45, true).translate(-310.8, 0, 177.5), steelColor);
add("front-handle", box(240, 42, 50, true).translate(-100.8, 0, 55), steelColor);
add("pivot", cylinder(70, 75, 8).translate(100.8, 0, 155), safetyMarkingColor);
add("ram-cylinder", box(352.8, 84, 92, true).translate(235.2, 0, 196), safetyMarkingColor);
add("ram-piston", box(235.2, 52, 58, true).translate(453.6, 0, 184), toolCoatingColor);
add("ram-foot", box(68, 150, 120, true).translate(588, 0, 190), safetyMarkingColor);

return p.model();
