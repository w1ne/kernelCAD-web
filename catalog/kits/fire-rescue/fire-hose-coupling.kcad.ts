// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire hose coupling scene prop, modeled from scratch.
meta({
  name: "fire-hose-coupling",
  license: 'CC0-1.0',
  title: "Fire hose coupling",
  description: "Threaded fire-service coupling with grip ribs, flange and open bore. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-hose-coupling");
const groundOffset = -4.96;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("coupling-barrel", cylinder(127.6, 39.68, 10).rotate([0, 1, 0], 90).translate(-30.8, 0, 62), body);
add("male-end", cylinder(57.2, 27.28, 10).rotate([0, 1, 0], 90).translate(61.6, 0, 62), accent);
add("grip-rib-0", cylinder(22, 48.36, 10).rotate([0, 1, 0], 90).translate(-83.6, 0, 62), accent);
add("grip-rib-1", cylinder(22, 48.36, 10).rotate([0, 1, 0], 90).translate(-55, 0, 62), accent);
add("grip-rib-2", cylinder(22, 48.36, 10).rotate([0, 1, 0], 90).translate(-26.4, 0, 62), accent);
add("flange", cylinder(35, 57.04, 10).rotate([0, 1, 0], 90).translate(-105.6, 0, 62), body);

return p.model();
