// SPDX-License-Identifier: CC0-1.0
// Adjustable rescue support strut with foot plates, telescoping sections and ratchet. Material controls: tool coating, safety marking, steel and aluminum; weathered and highVisibility presets.
meta({
  name: "vehicle-stabilization-strut",
  license: 'CC0-1.0',
  title: "Vehicle stabilization strut",
  description: "Adjustable rescue support strut with foot plates, telescoping sections and ratchet. Material controls: tool coating, safety marking, steel and aluminum; weathered and highVisibility presets.",
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
const p = assembly("vehicle-stabilization-strut");
const groundOffset = -18;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("base-plate", box(250, 250, 36, true).translate(0, 0, 36), toolCoatingColor);
add("outer-strut", cylinder(646.8, 68, 8).translate(0, 0, 55), safetyMarkingColor);
add("inner-strut", cylinder(294, 38, 8).translate(0, 0, 607.6), toolCoatingColor);
add("ratchet-handle", box(180, 38, 34, true).translate(90, 0, 536.4), steelColor);
add("top-pad", box(230, 230, 40, true).translate(0, 0, 902), toolCoatingColor);

return p.model();
