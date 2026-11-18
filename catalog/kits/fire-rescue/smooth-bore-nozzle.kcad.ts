// SPDX-License-Identifier: CC0-1.0
// Simple smooth-bore tip with tapered barrel and hose coupling tail. Material controls: nozzle metal, selector finish; weathered and highVisibility presets.
meta({
  name: "smooth-bore-nozzle",
  license: 'CC0-1.0',
  title: "Smooth bore fire nozzle",
  description: "Simple smooth-bore tip with tapered barrel and hose coupling tail. Material controls: nozzle metal, selector finish; weathered and highVisibility presets.",
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
presets({
  weathered: { nozzleMetalColor: '#858f91', selectorFinishColor: '#9b7e37' },
  highVisibility: { nozzleMetalColor: '#c4c8b8', selectorFinishColor: '#eedb59' },
});
const p = assembly("smooth-bore-nozzle");
const groundOffset = -9;
const add = (name, shape, finish = nozzleMetalColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-tail", cylinder(65, 45, 10).rotateY(90).translate(-90, 0, 54), nozzleMetalColor);
add("nozzle-body", cylinder(117.5, 34, 10).rotateY(90).translate(-7.5, 0, 54), nozzleMetalColor);
add("tip", cylinder(45, 22, 10).rotateY(90).translate(80, 0, 54), selectorFinishColor);

return p.model();
