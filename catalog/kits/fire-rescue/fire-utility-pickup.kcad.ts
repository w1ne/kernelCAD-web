// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire utility pickup scene prop, modeled from scratch.
meta({
  name: "fire-utility-pickup",
  license: 'CC0-1.0',
  title: "Fire utility pickup",
  description: "Crew pickup with utility bed, compartment boxes, ladder rack and beacon bar. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-utility-pickup");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1134, 350, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-405, -169, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-405, -292.2, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-405, -155.8, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-405, 279, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-405, 155.8, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-405, 292.2, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(378, -169, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(378, -292.2, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(378, -155.8, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(378, 279, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(378, 155.8, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(378, 292.2, 155), accent);
add("crew-cab", box(378, 308, 495.6, true).translate(391.5, 0, 542.8), accent);
add("windshield", box(83.16, 280, 109.032, true).translate(493.56, 0, 642.096), body);
add("side-window--1", box(132.3, 20, 94.164, true).translate(327.24, -157.5, 694.794), body);
add("side-window-1", box(132.3, 20, 94.164, true).translate(327.24, 157.5, 694.794), body);
add("cab-roof", box(396.9, 336, 40, true).translate(391.5, 0, 810.6), body);
add("front-bumper", box(115, 469, 95, true).translate(634.5, 0, 177.5), accent);
add("warning-lightbar", box(279.72, 62, 45, true).translate(391.5, 0, 856.1), accent);
add("utility-deck", box(580.5, 441, 175, true).translate(-270, 0, 387.5), body);
add("utility-locker--1", box(405, 34, 145, true).translate(-243, -161, 402.5), accent);
add("utility-locker-1", box(405, 34, 145, true).translate(-243, 161, 402.5), accent);
add("ladder-rack", box(850.5, 50, 28, true).translate(-54, 0, 899), body);
add("rack-post--1", box(35, 35, 245, true).translate(-54, -196, 582.5), accent);
add("rack-post-1", box(35, 35, 245, true).translate(-54, 196, 582.5), accent);
add("roof-antenna", cylinder(200, 10, 8).translate(311.5, 0, 850.6), body);

return p.model();
