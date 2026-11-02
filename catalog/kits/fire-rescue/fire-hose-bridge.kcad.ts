// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire hose bridge scene prop, modeled from scratch.
meta({
  name: "fire-hose-bridge",
  license: 'CC0-1.0',
  title: "Fire hose bridge",
  description: "Low protective road bridge with paired ramps and a recessed hose channel. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-hose-bridge");
const groundOffset = -9.23;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("center-channel", box(310.8, 187.2, 61.2, true).translate(0, 0, 106.2), accent);
add("approach-ramp--1", box(148, 520, 61.2, true).rotate([0, 1, 0], 18).translate(-214.6, 0, 61.2), body);
add("outer-rail--1", box(444, 50, 36, true).translate(-133.2, -218.4, 97.2), accent);
add("approach-ramp-1", box(148, 520, 61.2, true).rotate([0, 1, 0], -18).translate(214.6, 0, 61.2), body);
add("outer-rail-1", box(444, 50, 36, true).translate(133.2, 218.4, 97.2), accent);

return p.model();
