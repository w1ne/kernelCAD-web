// SPDX-License-Identifier: CC0-1.0
// Threaded fire-service coupling with grip ribs, flange and open bore. Material controls: steel and aluminum, safety marking, rubber grip, tool coating; weathered and highVisibility presets.
meta({
  name: "fire-hose-coupling",
  license: 'CC0-1.0',
  title: "Fire hose coupling",
  description: "Threaded fire-service coupling with grip ribs, flange and open bore. Material controls: steel and aluminum, safety marking, rubber grip, tool coating; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const steelColor = param('steelColor', '#aab5b9', { label: 'Steel and aluminum' });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking' });
const gripRubberColor = param('gripRubberColor', '#303539', { label: 'Rubber grip' });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
presets({
  weathered: { steelColor: '#858f92', safetyMarkingColor: '#874e49', gripRubberColor: '#41423f', toolCoatingColor: '#956438' },
  highVisibility: { steelColor: '#c3c6b6', safetyMarkingColor: '#f0db56', gripRubberColor: '#303539', toolCoatingColor: '#e8b331' },
});
const p = assembly("fire-hose-coupling");
const groundOffset = -4.96;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("coupling-barrel", cylinder(127.6, 39.68, 10).rotateY(90).translate(-30.8, 0, 62), steelColor);
add("male-end", cylinder(57.2, 27.28, 10).rotateY(90).translate(61.6, 0, 62), safetyMarkingColor);
add("grip-rib-0", cylinder(22, 48.36, 10).rotateY(90).translate(-83.6, 0, 62), gripRubberColor);
add("grip-rib-1", cylinder(22, 48.36, 10).rotateY(90).translate(-55, 0, 62), gripRubberColor);
add("grip-rib-2", cylinder(22, 48.36, 10).rotateY(90).translate(-26.4, 0, 62), gripRubberColor);
add("flange", cylinder(35, 57.04, 10).rotateY(90).translate(-105.6, 0, 62), steelColor);

return p.model();
