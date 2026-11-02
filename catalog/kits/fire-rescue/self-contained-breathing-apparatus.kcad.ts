// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly self-contained breathing apparatus scene prop, modeled from scratch.
meta({
  name: "self-contained-breathing-apparatus",
  license: 'CC0-1.0',
  title: "Self-contained breathing apparatus",
  description: "Backpack assembly with air cylinder, harness straps, valve and regulator hose. Knobs: overall scale, body color and accent color.",
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
const p = assembly("self-contained-breathing-apparatus");
const groundOffset = -300;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("backplate", box(330, 150, 470, true).translate(0, 0, 535), body);
add("air-cylinder", cylinder(560, 105, 10).translate(-40, 0, 300), accent);
add("valve", cylinder(80, 42, 8).translate(-40, 0, 860), body);
add("shoulder-strap--1", box(70, 55, 340, true).translate(0, -105, 750), accent);
add("waist-strap--1", box(160, 48, 52, true).translate(90, -88, 356), accent);
add("shoulder-strap-1", box(70, 55, 340, true).translate(0, 105, 750), accent);
add("waist-strap-1", box(160, 48, 52, true).translate(90, 88, 356), accent);
add("regulator", box(130, 100, 110, true).translate(165, -20, 615), body);
add("air-hose", cylinder(220, 18, 10).rotate([0, 1, 0], 90).translate(225, 0, 525), accent);

return p.model();
