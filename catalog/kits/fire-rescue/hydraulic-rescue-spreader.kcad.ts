// SPDX-License-Identifier: CC0-1.0
// Powered rescue spreader with opening jaws, center pivot and hand grips. Material controls: tool coating, steel and aluminum, safety marking; weathered and highVisibility presets.
meta({
  name: "hydraulic-rescue-spreader",
  license: 'CC0-1.0',
  title: "Hydraulic rescue spreader",
  description: "Powered rescue spreader with opening jaws, center pivot and hand grips. Material controls: tool coating, steel and aluminum, safety marking; weathered and highVisibility presets.",
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
const p = assembly("hydraulic-rescue-spreader");
const groundOffset = -30;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tool-body", box(319.2, 110, 125, true).translate(-60.8, 0, 152.5), toolCoatingColor);
add("rear-handle", box(90, 230, 45, true).translate(-281.2, 0, 177.5), steelColor);
add("front-handle", box(240, 42, 50, true).translate(-91.2, 0, 55), steelColor);
add("pivot", cylinder(70, 75, 8).translate(91.2, 0, 155), safetyMarkingColor);
add("jaw--1", box(334.4, 48, 50, true).rotateZ(-36).translate(258.4, -120, 255), toolCoatingColor);
add("jaw-tip--1", box(85, 45, 70, true).translate(425.6, -160, 265), safetyMarkingColor);
add("jaw-1", box(334.4, 48, 50, true).rotateZ(36).translate(258.4, 120, 255), toolCoatingColor);
add("jaw-tip-1", box(85, 45, 70, true).translate(425.6, 160, 265), safetyMarkingColor);

return p.model();
