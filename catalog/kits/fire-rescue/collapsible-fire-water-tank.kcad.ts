// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly collapsible fire water tank scene prop, modeled from scratch.
meta({
  name: "collapsible-fire-water-tank",
  license: 'CC0-1.0',
  title: "Collapsible fire water tank",
  description: "Portable fold-flat water reservoir with rigid rim, corner supports and drain outlet. Knobs: overall scale, body color and accent color.",
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
const p = assembly("collapsible-fire-water-tank");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("tank-floor", box(920, 760, 36, true).translate(0, 0, 36), accent);
add("tank-wall-x--1", box(45, 760, 457.6, true).translate(-432.4, 0, 473.2), body);
add("tank-wall-y--1", box(920, 45, 457.6, true).translate(0, -357.2, 473.2), body);
add("corner-post--1-a", box(44, 44, 520, true).translate(-395.6, -326.8, 260), accent);
add("corner-post--1-b", box(44, 44, 520, true).translate(395.6, 326.8, 260), accent);
add("tank-wall-x-1", box(45, 760, 457.6, true).translate(432.4, 0, 473.2), body);
add("tank-wall-y-1", box(920, 45, 457.6, true).translate(0, 357.2, 473.2), body);
add("corner-post-1-a", box(44, 44, 520, true).translate(395.6, 326.8, 260), accent);
add("corner-post-1-b", box(44, 44, 520, true).translate(-395.6, -326.8, 260), accent);
add("drain-outlet", cylinder(130, 42, 10).rotate([0, 1, 0], 90).translate(441.6, 0, 120), accent);

return p.model();
