// SPDX-License-Identifier: CC0-1.0
// Floating water pump with guarded intake, motor pod and hose connection. Material controls: steel and aluminum, safety marking, tool coating; weathered and highVisibility presets.
meta({
  name: "floating-draft-pump",
  license: 'CC0-1.0',
  title: "Floating draft pump",
  description: "Floating water pump with guarded intake, motor pod and hose connection. Material controls: steel and aluminum, safety marking, tool coating; weathered and highVisibility presets.",
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
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
presets({
  weathered: { steelColor: '#858f92', safetyMarkingColor: '#874e49', toolCoatingColor: '#956438' },
  highVisibility: { steelColor: '#c3c6b6', safetyMarkingColor: '#f0db56', toolCoatingColor: '#e8b331' },
});
const p = assembly("floating-draft-pump");
const groundOffset = 10;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("pump-frame", box(570, 390, 130, true).translate(0, 0, 150), steelColor);
add("engine-housing", box(300, 290, 230, true).translate(-40, 0, 330), safetyMarkingColor);
add("pump-volute", cylinder(125, 110, 10).rotateY(90).translate(180, 0, 290), toolCoatingColor);
add("hose-port--1", cylinder(130, 50, 10).rotateY(90).translate(200, -210, 200), safetyMarkingColor);
add("hose-port-1", cylinder(130, 50, 10).rotateY(90).translate(200, 210, 200), safetyMarkingColor);
add("float-pontoon-left", box(620, 170, 60, true).translate(0, -240, 50), safetyMarkingColor);
add("float-pontoon-right", box(620, 170, 60, true).translate(0, 240, 50), safetyMarkingColor);
add("intake-screen", cylinder(130, 80, 8).rotateY(90).translate(-240, 0, 70), toolCoatingColor);

return p.model();
