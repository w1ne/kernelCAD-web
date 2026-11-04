// SPDX-License-Identifier: CC0-1.0
// Open-frame rescue basket with perimeter rails, cross supports and four carry handles. Material controls: safety marking, steel and aluminum, tool coating; weathered and highVisibility presets.
meta({
  name: "rescue-basket-stretcher",
  license: 'CC0-1.0',
  title: "Rescue basket stretcher",
  description: "Open-frame rescue basket with perimeter rails, cross supports and four carry handles. Material controls: safety marking, steel and aluminum, tool coating; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking' });
const steelColor = param('steelColor', '#aab5b9', { label: 'Steel and aluminum' });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
presets({
  weathered: { safetyMarkingColor: '#874e49', steelColor: '#858f92', toolCoatingColor: '#956438' },
  highVisibility: { safetyMarkingColor: '#f0db56', steelColor: '#c3c6b6', toolCoatingColor: '#e8b331' },
});
const p = assembly("rescue-basket-stretcher");
const groundOffset = -70;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("basket-bed", box(871.5, 280.8, 55, true).translate(0, 0, 117.5), safetyMarkingColor);
add("long-rail--1", box(1050, 42, 70, true).translate(0, -165.6, 150), steelColor);
add("carry-handle--1-0", box(120, 32, 32, true).translate(-378, -230.4, 96), steelColor);
add("carry-handle--1-1", box(120, 32, 32, true).translate(0, -230.4, 96), steelColor);
add("carry-handle--1-2", box(120, 32, 32, true).translate(378, -230.4, 96), steelColor);
add("long-rail-1", box(1050, 42, 70, true).translate(0, 165.6, 150), steelColor);
add("carry-handle-1-0", box(120, 32, 32, true).translate(-378, 230.4, 96), steelColor);
add("carry-handle-1-1", box(120, 32, 32, true).translate(0, 230.4, 96), steelColor);
add("carry-handle-1-2", box(120, 32, 32, true).translate(378, 230.4, 96), steelColor);
add("cross-support-0", box(32, 295.2, 35, true).translate(-367.5, 0, 87.5), toolCoatingColor);
add("cross-support-1", box(32, 295.2, 35, true).translate(-183.75, 0, 87.5), toolCoatingColor);
add("cross-support-2", box(32, 295.2, 35, true).translate(0, 0, 87.5), toolCoatingColor);
add("cross-support-3", box(32, 295.2, 35, true).translate(183.75, 0, 87.5), toolCoatingColor);
add("cross-support-4", box(32, 295.2, 35, true).translate(367.5, 0, 87.5), toolCoatingColor);

return p.model();
