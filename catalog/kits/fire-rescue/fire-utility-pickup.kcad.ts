// SPDX-License-Identifier: CC0-1.0
// Crew pickup with utility bed, compartment boxes, ladder rack and beacon bar. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "fire-utility-pickup",
  license: 'CC0-1.0',
  title: "Fire utility pickup",
  description: "Crew pickup with utility bed, compartment boxes, ladder rack and beacon bar. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const metalworkColor = param('metalworkColor', '#aab6ba', { label: 'Ladder and metalwork' });
const tireRubberColor = param('tireRubberColor', '#262b2f', { label: 'Tire rubber' });
const cabPaintColor = param('cabPaintColor', '#eee7d7', { label: 'Cab and locker finish' });
const bodyPaintColor = param('bodyPaintColor', '#c93630', { label: 'Apparatus body paint' });
presets({
  weathered: { metalworkColor: '#879294', tireRubberColor: '#3a3b39', cabPaintColor: '#cfc4ae', bodyPaintColor: '#89534b' },
  highVisibility: { metalworkColor: '#c5c7ab', tireRubberColor: '#272c30', cabPaintColor: '#f4e7b1', bodyPaintColor: '#e77f23' },
});
const p = assembly("fire-utility-pickup");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1134, 350, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-405, -169, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-405, -292.2, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-405, -155.8, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-405, 279, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-405, 155.8, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-405, 292.2, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(378, -169, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(378, -292.2, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(378, -155.8, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(378, 279, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(378, 155.8, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(378, 292.2, 155), metalworkColor);
add("crew-cab", box(378, 308, 495.6, true).translate(391.5, 0, 542.8), cabPaintColor);
add("windshield", box(83.16, 280, 109.032, true).translate(493.56, 0, 642.096), metalworkColor);
add("side-window--1", box(132.3, 20, 94.164, true).translate(327.24, -157.5, 694.794), metalworkColor);
add("side-window-1", box(132.3, 20, 94.164, true).translate(327.24, 157.5, 694.794), metalworkColor);
add("cab-roof", box(396.9, 336, 40, true).translate(391.5, 0, 810.6), bodyPaintColor);
add("front-bumper", box(115, 469, 95, true).translate(634.5, 0, 177.5), metalworkColor);
add("warning-lightbar", box(279.72, 62, 45, true).translate(391.5, 0, 856.1), cabPaintColor);
add("utility-deck", box(580.5, 441, 175, true).translate(-270, 0, 387.5), bodyPaintColor);
add("utility-locker--1", box(405, 34, 145, true).translate(-243, -161, 402.5), cabPaintColor);
add("utility-locker-1", box(405, 34, 145, true).translate(-243, 161, 402.5), cabPaintColor);
add("ladder-rack", box(850.5, 50, 28, true).translate(-54, 0, 899), metalworkColor);
add("rack-post--1", box(35, 35, 245, true).translate(-54, -196, 582.5), cabPaintColor);
add("rack-post-1", box(35, 35, 245, true).translate(-54, 196, 582.5), cabPaintColor);
add("roof-antenna", cylinder(200, 10, 8).translate(311.5, 0, 850.6), bodyPaintColor);

add("front-grille", box(26, 220, 64, true).translate(692.500, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(682.500, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(682.500, 165, 215.500), cabPaintColor);

return p.model();
