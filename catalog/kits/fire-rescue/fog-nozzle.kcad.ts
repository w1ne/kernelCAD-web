// SPDX-License-Identifier: CC0-1.0
// Compact fog nozzle with ribbed selector collar, barrel and pistol grip. Material controls: nozzle metal, selector finish, rubber grip; weathered and highVisibility presets.
meta({
  name: "fog-nozzle",
  license: 'CC0-1.0',
  title: "Fog fire nozzle",
  description: "Compact fog nozzle with ribbed selector collar, barrel and pistol grip. Material controls: nozzle metal, selector finish, rubber grip; weathered and highVisibility presets.",
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
const p = assembly("fog-nozzle");
const groundOffset = 0;
const add = (name, shape, finish = nozzleMetalColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-tail", cylinder(72.8, 45, 10).rotateY(90).translate(-100.8, 0, 54), nozzleMetalColor);
add("nozzle-body", cylinder(131.6, 42, 10).rotateY(90).translate(-8.4, 0, 54), nozzleMetalColor);
add("tip", cylinder(50.4, 52, 10).rotateY(90).translate(89.6, 0, 54), selectorFinishColor);
add("selector-rib-0", cylinder(12, 52, 10).rotateY(90).translate(-39.2, 0, 54), gripRubberColor);
add("selector-rib-1", cylinder(12, 52, 10).rotateY(90).translate(-11.2, 0, 54), gripRubberColor);
add("selector-rib-2", cylinder(12, 52, 10).rotateY(90).translate(16.8, 0, 54), gripRubberColor);
add("selector-rib-3", cylinder(12, 52, 10).rotateY(90).translate(44.8, 0, 54), gripRubberColor);
add("pistol-grip", box(38, 42, 80, true).translate(-30, 0, 40), gripRubberColor);

return p.model();
