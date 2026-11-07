// SPDX-License-Identifier: CC0-1.0
// Inline foam proportioning body with pickup tube, selector dial and hose couplings. Material controls: tool coating, steel and aluminum, safety marking; weathered and highVisibility presets.
meta({
  name: "foam-eductor",
  license: 'CC0-1.0',
  title: "Fire foam eductor",
  description: "Inline foam proportioning body with pickup tube, selector dial and hose couplings. Material controls: tool coating, steel and aluminum, safety marking; weathered and highVisibility presets.",
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
const p = assembly("foam-eductor");
const groundOffset = 2;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("eductor-body", cylinder(460, 54, 10).rotateY(90).translate(0, 0, 70), toolCoatingColor);
add("inlet-coupling", cylinder(125, 72, 10).rotateY(90).translate(275, 0, 70), steelColor);
add("outlet-coupling", cylinder(125, 72, 10).rotateY(90).translate(-275, 0, 70), steelColor);
add("proportioning-dial", box(78, 75, 80, true).translate(0, 0, 165), safetyMarkingColor);
add("pickup-hose", cylinder(240, 18, 10).translate(0, 125, 20), toolCoatingColor);

return p.model();
