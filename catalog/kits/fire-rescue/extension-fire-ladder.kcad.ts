// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly extension fire ladder scene prop, modeled from scratch.
meta({
  name: "extension-fire-ladder",
  license: 'CC0-1.0',
  title: "Extension fire ladder",
  description: "Two-section extension ladder with parallel rails, repeated rungs and sliding locks. Knobs: overall scale, body color and accent color.",
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
const p = assembly("extension-fire-ladder");
const groundOffset = -58.8;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("ladder-rail--1", box(1380, 42, 48, true).translate(0, -155.4, 82.8), accent);
add("ladder-rail-1", box(1380, 42, 48, true).translate(0, 155.4, 82.8), accent);
add("ladder-rung-0", box(26, 310.8, 26, true).translate(-593.4, 0, 71.8), body);
add("ladder-rung-1", box(26, 310.8, 26, true).translate(-461.533, 0, 71.8), body);
add("ladder-rung-2", box(26, 310.8, 26, true).translate(-329.667, 0, 71.8), body);
add("ladder-rung-3", box(26, 310.8, 26, true).translate(-197.8, 0, 71.8), body);
add("ladder-rung-4", box(26, 310.8, 26, true).translate(-65.933, 0, 71.8), body);
add("ladder-rung-5", box(26, 310.8, 26, true).translate(65.933, 0, 71.8), body);
add("ladder-rung-6", box(26, 310.8, 26, true).translate(197.8, 0, 71.8), body);
add("ladder-rung-7", box(26, 310.8, 26, true).translate(329.667, 0, 71.8), body);
add("ladder-rung-8", box(26, 310.8, 26, true).translate(461.533, 0, 71.8), body);
add("ladder-rung-9", box(26, 310.8, 26, true).translate(593.4, 0, 71.8), body);
add("fly-rail--1", box(1159.2, 30, 42, true).translate(0, -96.6, 151.8), body);
add("fly-rail-1", box(1159.2, 30, 42, true).translate(0, 96.6, 151.8), body);
add("fly-rung-0", box(20, 193.2, 20, true).translate(-552, 0, 140.8), accent);
add("fly-rung-1", box(20, 193.2, 20, true).translate(-394.286, 0, 140.8), accent);
add("fly-rung-2", box(20, 193.2, 20, true).translate(-236.571, 0, 140.8), accent);
add("fly-rung-3", box(20, 193.2, 20, true).translate(-78.857, 0, 140.8), accent);
add("fly-rung-4", box(20, 193.2, 20, true).translate(78.857, 0, 140.8), accent);
add("fly-rung-5", box(20, 193.2, 20, true).translate(236.571, 0, 140.8), accent);
add("fly-rung-6", box(20, 193.2, 20, true).translate(394.286, 0, 140.8), accent);
add("fly-rung-7", box(20, 193.2, 20, true).translate(552, 0, 140.8), accent);

return p.model();
