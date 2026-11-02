// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rescue basket stretcher scene prop, modeled from scratch.
meta({
  name: "rescue-basket-stretcher",
  license: 'CC0-1.0',
  title: "Rescue basket stretcher",
  description: "Open-frame rescue basket with perimeter rails, cross supports and four carry handles. Knobs: overall scale, body color and accent color.",
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
const p = assembly("rescue-basket-stretcher");
const groundOffset = -70;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("basket-bed", box(871.5, 280.8, 55, true).translate(0, 0, 117.5), accent);
add("long-rail--1", box(1050, 42, 70, true).translate(0, -165.6, 150), body);
add("carry-handle--1-0", box(120, 32, 32, true).translate(-378, -230.4, 96), accent);
add("carry-handle--1-1", box(120, 32, 32, true).translate(0, -230.4, 96), accent);
add("carry-handle--1-2", box(120, 32, 32, true).translate(378, -230.4, 96), accent);
add("long-rail-1", box(1050, 42, 70, true).translate(0, 165.6, 150), body);
add("carry-handle-1-0", box(120, 32, 32, true).translate(-378, 230.4, 96), accent);
add("carry-handle-1-1", box(120, 32, 32, true).translate(0, 230.4, 96), accent);
add("carry-handle-1-2", box(120, 32, 32, true).translate(378, 230.4, 96), accent);
add("cross-support-0", box(32, 295.2, 35, true).translate(-367.5, 0, 87.5), body);
add("cross-support-1", box(32, 295.2, 35, true).translate(-183.75, 0, 87.5), body);
add("cross-support-2", box(32, 295.2, 35, true).translate(0, 0, 87.5), body);
add("cross-support-3", box(32, 295.2, 35, true).translate(183.75, 0, 87.5), body);
add("cross-support-4", box(32, 295.2, 35, true).translate(367.5, 0, 87.5), body);

return p.model();
