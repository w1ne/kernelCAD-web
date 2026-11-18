// SPDX-License-Identifier: CC0-1.0
// Low protective road bridge with paired ramps and a recessed hose channel. Material controls: safety marking, tool coating, steel and aluminum; weathered and highVisibility presets.
meta({
  name: "fire-hose-bridge",
  license: 'CC0-1.0',
  title: "Fire hose bridge",
  description: "Low protective road bridge with paired ramps and a recessed hose channel. Material controls: safety marking, tool coating, steel and aluminum; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking' });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
const steelColor = param('steelColor', '#aab5b9', { label: 'Steel and aluminum' });
presets({
  weathered: { safetyMarkingColor: '#874e49', toolCoatingColor: '#956438', steelColor: '#858f92' },
  highVisibility: { safetyMarkingColor: '#f0db56', toolCoatingColor: '#e8b331', steelColor: '#c3c6b6' },
});
const p = assembly("fire-hose-bridge");
const groundOffset = -9.23;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("center-channel", box(310.8, 187.2, 61.2, true).translate(0, 0, 106.2), safetyMarkingColor);
add("approach-ramp--1", box(148, 520, 61.2, true).rotateY(18).translate(-214.6, 0, 61.2), toolCoatingColor);
add("outer-rail--1", box(444, 50, 36, true).translate(-133.2, -218.4, 97.2), steelColor);
add("approach-ramp-1", box(148, 520, 61.2, true).rotateY(-18).translate(214.6, 0, 61.2), toolCoatingColor);
add("outer-rail-1", box(444, 50, 36, true).translate(133.2, 218.4, 97.2), steelColor);

return p.model();
