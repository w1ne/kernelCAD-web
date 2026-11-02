// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly roof hook pike pole scene prop, modeled from scratch.
meta({
  name: "roof-hook-pike-pole",
  license: 'CC0-1.0',
  title: "Roof hook pike pole",
  description: "Long fireground pole with protective grip bands and a hooked metal head. Knobs: overall scale, body color and accent color.",
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
const p = assembly("roof-hook-pike-pole");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("shaft", cylinder(1280, 24, 8).translate(0, 0, 0), body);
add("grip-band-0", cylinder(18, 30, 8).translate(0, 0, 180), accent);
add("grip-band-1", cylinder(18, 30, 8).translate(0, 0, 222), accent);
add("grip-band-2", cylinder(18, 30, 8).translate(0, 0, 264), accent);
add("grip-band-3", cylinder(18, 30, 8).translate(0, 0, 306), accent);
add("grip-band-4", cylinder(18, 30, 8).translate(0, 0, 348), accent);
add("hook-spine", box(35, 32, 170, true).translate(0, 0, 1435), accent);
add("hook-tip", box(145, 32, 35, true).translate(72, 0, 1432.5), body);

return p.model();
