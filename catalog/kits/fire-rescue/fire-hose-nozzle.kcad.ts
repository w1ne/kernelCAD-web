// SPDX-License-Identifier: CC0-1.0
// Straight fire hose nozzle with barrel, selector collar, pistol grip and adjustable front tip. Material controls: nozzle metal, selector finish, rubber grip; weathered and highVisibility presets.
meta({
  name: "fire-hose-nozzle",
  license: 'CC0-1.0',
  title: "Fire hose nozzle",
  description: "Straight fire hose nozzle with barrel, selector collar, pistol grip and adjustable front tip. Material controls: nozzle metal, selector finish, rubber grip; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const nozzleMetalColor = param('nozzleMetalColor', '#aeb8ba', { label: 'Nozzle metal' });
const selectorFinishColor = param('selectorFinishColor', '#d2ad3e', { label: 'Selector finish' });
const gripRubberColor = param('gripRubberColor', '#303539', { label: 'Rubber grip' });
presets({
  weathered: { nozzleMetalColor: '#858f91', selectorFinishColor: '#9b7e37', gripRubberColor: '#41423f' },
  highVisibility: { nozzleMetalColor: '#c4c8b8', selectorFinishColor: '#eedb59', gripRubberColor: '#303539' },
});
const p = assembly("fire-hose-nozzle");
const groundOffset = 10;
const add = (name, shape, finish = nozzleMetalColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-tail", cylinder(80.6, 45, 10).rotateY(90).translate(-111.6, 0, 54), nozzleMetalColor);
add("nozzle-body", cylinder(145.7, 34, 10).rotateY(90).translate(-9.3, 0, 54), nozzleMetalColor);
add("tip", cylinder(55.8, 22, 10).rotateY(90).translate(99.2, 0, 54), selectorFinishColor);
add("pistol-grip", cylinder(76, 23, 8).translate(-31, 0, -10), gripRubberColor);
add("selector-collar", cylinder(18, 42, 10).rotateY(90).translate(60, 0, 54), selectorFinishColor);

return p.model();
