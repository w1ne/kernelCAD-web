// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fog fire nozzle scene prop, modeled from scratch.
meta({
  name: "fog-nozzle",
  license: 'CC0-1.0',
  title: "Fog fire nozzle",
  description: "Compact fog nozzle with ribbed selector collar, barrel and pistol grip. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fog-nozzle");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-tail", cylinder(72.8, 45, 10).rotate([0, 1, 0], 90).translate(-100.8, 0, 54), accent);
add("nozzle-body", cylinder(131.6, 42, 10).rotate([0, 1, 0], 90).translate(-8.4, 0, 54), body);
add("tip", cylinder(50.4, 52, 10).rotate([0, 1, 0], 90).translate(89.6, 0, 54), accent);
add("selector-rib-0", cylinder(12, 52, 10).rotate([0, 1, 0], 90).translate(-39.2, 0, 54), accent);
add("selector-rib-1", cylinder(12, 52, 10).rotate([0, 1, 0], 90).translate(-11.2, 0, 54), accent);
add("selector-rib-2", cylinder(12, 52, 10).rotate([0, 1, 0], 90).translate(16.8, 0, 54), accent);
add("selector-rib-3", cylinder(12, 52, 10).rotate([0, 1, 0], 90).translate(44.8, 0, 54), accent);
add("pistol-grip", box(38, 42, 80, true).translate(-30, 0, 40), accent);

return p.model();
