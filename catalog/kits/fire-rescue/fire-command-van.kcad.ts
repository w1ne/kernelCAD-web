// SPDX-License-Identifier: CC0-1.0
// Incident command van with high roof, side windows, roof antenna and warning light bar. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "fire-command-van",
  license: 'CC0-1.0',
  title: "Fire command van",
  description: "Incident command van with high roof, side windows, roof antenna and warning light bar. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("fire-command-van");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1260, 360, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-450, -175.4, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-450, -298.6, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-450, -162.2, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-450, 285.4, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-450, 162.2, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-450, 298.6, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(420, -175.4, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(420, -298.6, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(420, -162.2, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(420, 285.4, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(420, 162.2, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(420, 298.6, 155), metalworkColor);
add("crew-cab", box(420, 316.8, 596.4, true).translate(435, 0, 593.2), cabPaintColor);
add("windshield", box(92.4, 288, 131.208, true).translate(548.4, 0, 708.624), metalworkColor);
add("side-window--1", box(147, 20, 113.316, true).translate(363.6, -162, 756.786), metalworkColor);
add("side-window-1", box(147, 20, 113.316, true).translate(363.6, 162, 756.786), metalworkColor);
add("cab-roof", box(441, 345.6, 40, true).translate(435, 0, 911.4), bodyPaintColor);
add("front-bumper", box(115, 482.4, 95, true).translate(705, 0, 177.5), metalworkColor);
add("warning-lightbar", box(310.8, 62, 45, true).translate(435, 0, 956.9), cabPaintColor);
add("apparatus-body", box(720, 432, 596.4, true).translate(-240, 0, 608.2), bodyPaintColor);
add("compartment--1-0", box(144, 26, 125, true).translate(-448.8, -220.32, 422.5), cabPaintColor);
add("compartment-handle--1-0", box(50.4, 16, 12, true).translate(-430.8, -236.16, 401), metalworkColor);
add("compartment--1-1", box(144, 26, 125, true).translate(-240, -220.32, 532.5), cabPaintColor);
add("compartment-handle--1-1", box(50.4, 16, 12, true).translate(-222, -236.16, 511), metalworkColor);
add("compartment--1-2", box(144, 26, 125, true).translate(-31.2, -220.32, 422.5), cabPaintColor);
add("compartment-handle--1-2", box(50.4, 16, 12, true).translate(-13.2, -236.16, 401), metalworkColor);
add("compartment-1-0", box(144, 26, 125, true).translate(-448.8, 220.32, 422.5), cabPaintColor);
add("compartment-handle-1-0", box(50.4, 16, 12, true).translate(-430.8, 236.16, 401), metalworkColor);
add("compartment-1-1", box(144, 26, 125, true).translate(-240, 220.32, 532.5), cabPaintColor);
add("compartment-handle-1-1", box(50.4, 16, 12, true).translate(-222, 236.16, 511), metalworkColor);
add("compartment-1-2", box(144, 26, 125, true).translate(-31.2, 220.32, 422.5), cabPaintColor);
add("compartment-handle-1-2", box(50.4, 16, 12, true).translate(-13.2, 236.16, 401), metalworkColor);
add("high-roof", box(441, 331.2, 140, true).translate(435, 0, 999.4), cabPaintColor);
add("radio-antenna", cylinder(260, 12, 8).translate(395, 0, 1071.4), bodyPaintColor);
add("roof-antenna", cylinder(200, 10, 8).translate(355, 0, 951.4), bodyPaintColor);

add("front-grille", box(26, 220, 64, true).translate(763.000, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(753.000, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(753.000, 165, 215.500), cabPaintColor);

return p.model();
