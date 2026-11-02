// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire command van scene prop, modeled from scratch.
meta({
  name: "fire-command-van",
  license: 'CC0-1.0',
  title: "Fire command van",
  description: "Incident command van with high roof, side windows, roof antenna and warning light bar. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-command-van");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1260, 360, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-450, -175.4, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-450, -298.6, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-450, -162.2, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-450, 285.4, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-450, 162.2, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-450, 298.6, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(420, -175.4, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(420, -298.6, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(420, -162.2, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(420, 285.4, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(420, 162.2, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(420, 298.6, 155), accent);
add("crew-cab", box(420, 316.8, 596.4, true).translate(435, 0, 593.2), accent);
add("windshield", box(92.4, 288, 131.208, true).translate(548.4, 0, 708.624), body);
add("side-window--1", box(147, 20, 113.316, true).translate(363.6, -162, 756.786), body);
add("side-window-1", box(147, 20, 113.316, true).translate(363.6, 162, 756.786), body);
add("cab-roof", box(441, 345.6, 40, true).translate(435, 0, 911.4), body);
add("front-bumper", box(115, 482.4, 95, true).translate(705, 0, 177.5), accent);
add("warning-lightbar", box(310.8, 62, 45, true).translate(435, 0, 956.9), accent);
add("apparatus-body", box(720, 432, 596.4, true).translate(-240, 0, 608.2), body);
add("compartment--1-0", box(144, 26, 125, true).translate(-448.8, -220.32, 422.5), accent);
add("compartment-handle--1-0", box(50.4, 16, 12, true).translate(-430.8, -236.16, 401), body);
add("compartment--1-1", box(144, 26, 125, true).translate(-240, -220.32, 532.5), accent);
add("compartment-handle--1-1", box(50.4, 16, 12, true).translate(-222, -236.16, 511), body);
add("compartment--1-2", box(144, 26, 125, true).translate(-31.2, -220.32, 422.5), accent);
add("compartment-handle--1-2", box(50.4, 16, 12, true).translate(-13.2, -236.16, 401), body);
add("compartment-1-0", box(144, 26, 125, true).translate(-448.8, 220.32, 422.5), accent);
add("compartment-handle-1-0", box(50.4, 16, 12, true).translate(-430.8, 236.16, 401), body);
add("compartment-1-1", box(144, 26, 125, true).translate(-240, 220.32, 532.5), accent);
add("compartment-handle-1-1", box(50.4, 16, 12, true).translate(-222, 236.16, 511), body);
add("compartment-1-2", box(144, 26, 125, true).translate(-31.2, 220.32, 422.5), accent);
add("compartment-handle-1-2", box(50.4, 16, 12, true).translate(-13.2, 236.16, 401), body);
add("high-roof", box(441, 331.2, 140, true).translate(435, 0, 999.4), accent);
add("radio-antenna", cylinder(260, 12, 8).translate(395, 0, 1071.4), body);
add("roof-antenna", cylinder(200, 10, 8).translate(355, 0, 951.4), body);

return p.model();
