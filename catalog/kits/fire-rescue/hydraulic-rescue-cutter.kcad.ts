// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly hydraulic rescue cutter scene prop, modeled from scratch.
meta({
  name: "hydraulic-rescue-cutter",
  license: 'CC0-1.0',
  title: "Hydraulic rescue cutter",
  description: "Powered extrication cutter with crossed jaws, pivot, handles and hose ports. Knobs: overall scale, body color and accent color.",
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
const p = assembly("hydraulic-rescue-cutter");
const groundOffset = -30;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tool-body", box(327.6, 110, 125, true).translate(-62.4, 0, 152.5), body);
add("rear-handle", box(90, 230, 45, true).translate(-288.6, 0, 177.5), accent);
add("front-handle", box(240, 42, 50, true).translate(-93.6, 0, 55), accent);
add("pivot", cylinder(70, 75, 8).translate(93.6, 0, 155), accent);
add("jaw--1", box(343.2, 48, 50, true).rotate([0, 0, 1], -24).translate(265.2, -120, 255), body);
add("jaw-tip--1", box(85, 45, 70, true).translate(436.8, -160, 265), accent);
add("jaw-1", box(343.2, 48, 50, true).rotate([0, 0, 1], 24).translate(265.2, 120, 255), body);
add("jaw-tip-1", box(85, 45, 70, true).translate(436.8, 160, 265), accent);

return p.model();
