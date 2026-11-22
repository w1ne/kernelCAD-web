// SPDX-License-Identifier: CC0-1.0
// Portable incident board with framed panel, status tiles and folding easel. Material controls: steel and aluminum, tool coating, safety marking; weathered and highVisibility presets.
meta({
  name: "fireground-command-board",
  license: 'CC0-1.0',
  title: "Fireground command board",
  description: "Portable incident board with framed panel, status tiles and folding easel. Material controls: steel and aluminum, tool coating, safety marking; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const steelColor = param('steelColor', '#aab5b9', { label: 'Steel and aluminum' });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking' });
presets({
  weathered: { steelColor: '#858f92', toolCoatingColor: '#956438', safetyMarkingColor: '#874e49' },
  highVisibility: { steelColor: '#c3c6b6', toolCoatingColor: '#e8b331', safetyMarkingColor: '#f0db56' },
});
const p = assembly("fireground-command-board");
const groundOffset = -431.353;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("board-frame", box(620, 70, 760, true).translate(0, 0, 1250), steelColor);
add("board-face", box(550, 24, 690, true).translate(0, -43, 1215), toolCoatingColor);
add("status-tile-0-0", box(88, 22, 82, true).translate(-195, -65, 1101), safetyMarkingColor);
add("status-tile-0-1", box(88, 22, 82, true).translate(-65, -65, 1101), safetyMarkingColor);
add("status-tile-0-2", box(88, 22, 82, true).translate(65, -65, 1101), safetyMarkingColor);
add("status-tile-0-3", box(88, 22, 82, true).translate(195, -65, 1101), safetyMarkingColor);
add("status-tile-1-0", box(88, 22, 82, true).translate(-195, -65, 916), safetyMarkingColor);
add("status-tile-1-1", box(88, 22, 82, true).translate(-65, -65, 916), safetyMarkingColor);
add("status-tile-1-2", box(88, 22, 82, true).translate(65, -65, 916), safetyMarkingColor);
add("status-tile-1-3", box(88, 22, 82, true).translate(195, -65, 916), safetyMarkingColor);
add("status-tile-2-0", box(88, 22, 82, true).translate(-195, -65, 731), safetyMarkingColor);
add("status-tile-2-1", box(88, 22, 82, true).translate(-65, -65, 731), safetyMarkingColor);
add("status-tile-2-2", box(88, 22, 82, true).translate(65, -65, 731), safetyMarkingColor);
add("status-tile-2-3", box(88, 22, 82, true).translate(195, -65, 731), safetyMarkingColor);
add("easel-leg--1", box(40, 45, 850, true).rotateY(-8).translate(-245, 0, 855), toolCoatingColor);
add("easel-leg-1", box(40, 45, 850, true).rotateY(8).translate(245, 0, 855), toolCoatingColor);

return p.model();
