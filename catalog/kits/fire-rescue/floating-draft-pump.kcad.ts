// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly floating draft pump scene prop, modeled from scratch.
meta({
  name: "floating-draft-pump",
  license: 'CC0-1.0',
  title: "Floating draft pump",
  description: "Floating water pump with guarded intake, motor pod and hose connection. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("floating-draft-pump");
const groundOffset = 10;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("pump-frame", box(570, 390, 130, true).translate(0, 0, 150), body);
add("engine-housing", box(300, 290, 230, true).translate(-40, 0, 330), accent);
add("pump-volute", cylinder(125, 110, 10).rotate([0, 1, 0], 90).translate(180, 0, 290), body);
add("hose-port--1", cylinder(130, 50, 10).rotate([0, 1, 0], 90).translate(200, -210, 200), accent);
add("hose-port-1", cylinder(130, 50, 10).rotate([0, 1, 0], 90).translate(200, 210, 200), accent);
add("float-pontoon-left", box(620, 170, 60, true).translate(0, -240, 50), accent);
add("float-pontoon-right", box(620, 170, 60, true).translate(0, 240, 50), accent);
add("intake-screen", cylinder(130, 80, 8).rotate([0, 1, 0], 90).translate(-240, 0, 70), body);

return p.model();
