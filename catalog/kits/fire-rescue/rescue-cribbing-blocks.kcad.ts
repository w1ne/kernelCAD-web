// SPDX-License-Identifier: CC0-1.0
// Stackable timber cribbing blocks with alternating layers and hand grooves. Material controls: tool coating, safety marking; weathered and highVisibility presets.
meta({
  name: "rescue-cribbing-blocks",
  license: 'CC0-1.0',
  title: "Rescue cribbing blocks",
  description: "Stackable timber cribbing blocks with alternating layers and hand grooves. Material controls: tool coating, safety marking; weathered and highVisibility presets.",
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
presets({
  weathered: { toolCoatingColor: '#956438', safetyMarkingColor: '#874e49' },
  highVisibility: { toolCoatingColor: '#e8b331', safetyMarkingColor: '#f0db56' },
});
const p = assembly("rescue-cribbing-blocks");
const groundOffset = -16;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("crib-layer-0-0", box(239.2, 259.2, 62, true).translate(-138, 0, 47), toolCoatingColor);
add("crib-layer-0-1", box(239.2, 259.2, 62, true).translate(0, 0, 47), toolCoatingColor);
add("crib-layer-0-2", box(239.2, 259.2, 62, true).translate(138, 0, 47), toolCoatingColor);
add("crib-layer-1-0", box(331.2, 187.2, 62, true).translate(0, -108, 113), safetyMarkingColor);
add("crib-layer-1-1", box(331.2, 187.2, 62, true).translate(0, 0, 113), safetyMarkingColor);
add("crib-layer-1-2", box(331.2, 187.2, 62, true).translate(0, 108, 113), safetyMarkingColor);
add("crib-layer-2-0", box(239.2, 259.2, 62, true).translate(-138, 0, 179), toolCoatingColor);
add("crib-layer-2-1", box(239.2, 259.2, 62, true).translate(0, 0, 179), toolCoatingColor);
add("crib-layer-2-2", box(239.2, 259.2, 62, true).translate(138, 0, 179), toolCoatingColor);
add("crib-layer-3-0", box(331.2, 187.2, 62, true).translate(0, -108, 245), safetyMarkingColor);
add("crib-layer-3-1", box(331.2, 187.2, 62, true).translate(0, 0, 245), safetyMarkingColor);
add("crib-layer-3-2", box(331.2, 187.2, 62, true).translate(0, 108, 245), safetyMarkingColor);

return p.model();
