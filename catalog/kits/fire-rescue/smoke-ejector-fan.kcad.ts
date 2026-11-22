// SPDX-License-Identifier: CC0-1.0
// Portable square-frame exhaust fan with radial blades, guard ring and carry handle. Material controls: lamp lens, guard and blade metal, rubber feet and grips, fan frame paint; weathered and highVisibility presets.
meta({
  name: "smoke-ejector-fan",
  license: 'CC0-1.0',
  title: "Smoke ejector fan",
  description: "Portable square-frame exhaust fan with radial blades, guard ring and carry handle. Material controls: lamp lens, guard and blade metal, rubber feet and grips, fan frame paint; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const lensColor = param('lensColor', '#d4e4dc', { label: 'Lamp lens' });
const guardMetalColor = param('guardMetalColor', '#89969b', { label: 'Guard and blade metal' });
const rubberFootColor = param('rubberFootColor', '#303539', { label: 'Rubber feet and grips' });
const fanFramePaintColor = param('fanFramePaintColor', '#d99029', { label: 'Fan frame paint' });
presets({
  weathered: { lensColor: '#b5c4bb', guardMetalColor: '#6f797c', rubberFootColor: '#41423f', fanFramePaintColor: '#916533' },
  highVisibility: { lensColor: '#f2e5aa', guardMetalColor: '#b9c0b6', rubberFootColor: '#303539', fanFramePaintColor: '#e9b632' },
});
const p = assembly("smoke-ejector-fan");
const groundOffset = 0;
const add = (name, shape, finish = fanFramePaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("fan-frame", box(510, 230, 330, true).translate(0, 0, 330), lensColor);
add("fan-hub", cylinder(42, 65, 8).rotateX(90).translate(0, -135, 190), guardMetalColor);
add("fan-blade-0", box(210, 50, 28, true).rotateX(0).translate(0, -115, 204), guardMetalColor);
add("fan-blade-1", box(210, 50, 28, true).rotateX(60).translate(0, -115, 204), guardMetalColor);
add("fan-blade-2", box(210, 50, 28, true).rotateX(120).translate(0, -115, 204), guardMetalColor);
add("fan-blade-3", box(210, 50, 28, true).rotateX(180).translate(0, -115, 204), guardMetalColor);
add("fan-blade-4", box(210, 50, 28, true).rotateX(240).translate(0, -115, 204), guardMetalColor);
add("fan-blade-5", box(210, 50, 28, true).rotateX(300).translate(0, -115, 204), guardMetalColor);
add("guard-ring", cylinder(24, 185, 12).rotateX(90).translate(0, -150, 190), guardMetalColor);
add("handle", box(250, 45, 40, true).translate(0, 0, 385), rubberFootColor);
add("floor-stand", box(240, 280, 45, true).translate(0, 0, 22.5), fanFramePaintColor);

return p.model();
