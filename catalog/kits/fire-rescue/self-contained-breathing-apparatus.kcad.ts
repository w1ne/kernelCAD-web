// SPDX-License-Identifier: CC0-1.0
// Backpack assembly with air cylinder, harness straps, valve and regulator hose. Material controls: harness webbing, air-cylinder finish, regulator hardware, breathing hose; weathered and highVisibility presets.
meta({
  name: "self-contained-breathing-apparatus",
  license: 'CC0-1.0',
  title: "Self-contained breathing apparatus",
  description: "Backpack assembly with air cylinder, harness straps, valve and regulator hose. Material controls: harness webbing, air-cylinder finish, regulator hardware, breathing hose; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const harnessColor = param('harnessColor', '#333a3e', { label: 'Harness webbing' });
const cylinderColor = param('cylinderColor', '#d0b53d', { label: 'Air-cylinder finish' });
const regulatorMetalColor = param('regulatorMetalColor', '#aeb8ba', { label: 'Regulator hardware' });
const hoseRubberColor = param('hoseRubberColor', '#262b2f', { label: 'Breathing hose' });
presets({
  weathered: { harnessColor: '#41413d', cylinderColor: '#aa923c', regulatorMetalColor: '#899294', hoseRubberColor: '#3c3e3b' },
  highVisibility: { harnessColor: '#353a3c', cylinderColor: '#ebd456', regulatorMetalColor: '#c6c9b7', hoseRubberColor: '#262b2f' },
});
const p = assembly("self-contained-breathing-apparatus");
const groundOffset = -300;
const add = (name, shape, finish = harnessColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("backplate", box(330, 150, 470, true).translate(0, 0, 535), harnessColor);
add("air-cylinder", cylinder(560, 105, 10).translate(-40, 0, 300), cylinderColor);
add("valve", cylinder(80, 42, 8).translate(-40, 0, 860), regulatorMetalColor);
add("shoulder-strap--1", box(70, 55, 340, true).translate(0, -105, 750), cylinderColor);
add("waist-strap--1", box(160, 48, 52, true).translate(90, -88, 356), cylinderColor);
add("shoulder-strap-1", box(70, 55, 340, true).translate(0, 105, 750), cylinderColor);
add("waist-strap-1", box(160, 48, 52, true).translate(90, 88, 356), cylinderColor);
add("regulator", box(130, 100, 110, true).translate(165, -20, 615), regulatorMetalColor);
add("air-hose", cylinder(220, 18, 10).rotateY(90).translate(225, 0, 525), hoseRubberColor);

return p.model();
