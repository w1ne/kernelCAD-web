// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly folding attic ladder scene prop, modeled from scratch.
meta({
  name: "folding-attic-ladder",
  license: 'CC0-1.0',
  title: "Folding attic ladder",
  description: "Foldable attic ladder with paired hinged sections, rails and rung steps. Knobs: overall scale, body color and accent color.",
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
const p = assembly("folding-attic-ladder");
const groundOffset = -126.242;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("section-0-rail--1", box(393.6, 42, 45, true).rotate([0, 1, 0], -28).translate(-147.6, -144, 238.5), accent);
add("section-0-rail-1", box(393.6, 42, 45, true).rotate([0, 1, 0], -28).translate(-147.6, 144, 238.5), accent);
add("section-0-rung-0", box(26, 288, 24, true).translate(-311.6, 0, 242), body);
add("section-0-rung-1", box(26, 288, 24, true).translate(-246, 0, 257), body);
add("section-0-rung-2", box(26, 288, 24, true).translate(-180.4, 0, 242), body);
add("section-0-rung-3", box(26, 288, 24, true).translate(-114.8, 0, 257), body);
add("section-0-rung-4", box(26, 288, 24, true).translate(-49.2, 0, 242), body);
add("section-0-rung-5", box(26, 288, 24, true).translate(16.4, 0, 257), body);
add("section-1-rail--1", box(393.6, 42, 45, true).rotate([0, 1, 0], 28).translate(147.6, -144, 238.5), accent);
add("section-1-rail-1", box(393.6, 42, 45, true).rotate([0, 1, 0], 28).translate(147.6, 144, 238.5), accent);
add("section-1-rung-0", box(26, 288, 24, true).translate(-16.4, 0, 242), body);
add("section-1-rung-1", box(26, 288, 24, true).translate(49.2, 0, 257), body);
add("section-1-rung-2", box(26, 288, 24, true).translate(114.8, 0, 242), body);
add("section-1-rung-3", box(26, 288, 24, true).translate(180.4, 0, 257), body);
add("section-1-rung-4", box(26, 288, 24, true).translate(246, 0, 242), body);
add("section-1-rung-5", box(26, 288, 24, true).translate(311.6, 0, 257), body);
add("hinge", cylinder(320, 45, 8).rotate([1, 0, 0], 90).translate(0, 0, 216), body);

return p.model();
