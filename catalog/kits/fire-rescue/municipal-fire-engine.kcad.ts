// SPDX-License-Identifier: CC0-1.0
// Structural pumper with crew cab, hosebed, side pump panel and deck monitor. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "municipal-fire-engine",
  license: 'CC0-1.0',
  title: "Municipal fire engine",
  description: "Structural pumper with crew cab, hosebed, side pump panel and deck monitor. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("municipal-fire-engine");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1428, 390, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-510, -194.6, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-510, -317.8, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-510, -181.4, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-510, 304.6, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-510, 181.4, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-510, 317.8, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(476, -194.6, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(476, -317.8, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(476, -181.4, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(476, 304.6, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(476, 181.4, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(476, 317.8, 155), metalworkColor);
add("crew-cab", box(408, 343.2, 588, true).translate(493, 0, 589), cabPaintColor);
add("windshield", box(89.76, 312, 129.36, true).translate(603.16, 0, 703.08), metalworkColor);
add("side-window--1", box(142.8, 20, 111.72, true).translate(423.64, -175.5, 751.62), metalworkColor);
add("side-window-1", box(142.8, 20, 111.72, true).translate(423.64, 175.5, 751.62), metalworkColor);
add("cab-roof", box(428.4, 374.4, 40, true).translate(493, 0, 903), bodyPaintColor);
add("front-bumper", box(115, 522.6, 95, true).translate(799, 0, 177.5), metalworkColor);
add("warning-lightbar", box(301.92, 62, 45, true).translate(493, 0, 948.5), cabPaintColor);
add("apparatus-body", box(816, 468, 588, true).translate(-272, 0, 604), bodyPaintColor);
add("compartment--1-0", box(163.2, 26, 125, true).translate(-508.64, -238.68, 422.5), cabPaintColor);
add("compartment-handle--1-0", box(57.12, 16, 12, true).translate(-488.24, -255.84, 401), metalworkColor);
add("compartment--1-1", box(163.2, 26, 125, true).translate(-272, -238.68, 532.5), cabPaintColor);
add("compartment-handle--1-1", box(57.12, 16, 12, true).translate(-251.6, -255.84, 511), metalworkColor);
add("compartment--1-2", box(163.2, 26, 125, true).translate(-35.36, -238.68, 422.5), cabPaintColor);
add("compartment-handle--1-2", box(57.12, 16, 12, true).translate(-14.96, -255.84, 401), metalworkColor);
add("compartment-1-0", box(163.2, 26, 125, true).translate(-508.64, 238.68, 422.5), cabPaintColor);
add("compartment-handle-1-0", box(57.12, 16, 12, true).translate(-488.24, 255.84, 401), metalworkColor);
add("compartment-1-1", box(163.2, 26, 125, true).translate(-272, 238.68, 532.5), cabPaintColor);
add("compartment-handle-1-1", box(57.12, 16, 12, true).translate(-251.6, 255.84, 511), metalworkColor);
add("compartment-1-2", box(163.2, 26, 125, true).translate(-35.36, 238.68, 422.5), cabPaintColor);
add("compartment-handle-1-2", box(57.12, 16, 12, true).translate(-14.96, 255.84, 401), metalworkColor);
add("hosebed", box(440.64, 327.6, 182, true).translate(-221, 0, 989), tireRubberColor);
add("pump-control-panel--1", box(163.2, 25, 200, true).translate(25.5, -246.48, 490), metalworkColor);
add("pump-control-panel-1", box(163.2, 25, 200, true).translate(25.5, 246.48, 490), metalworkColor);
add("deck-monitor-base", cylinder(48, 54, 8).translate(-340, 0, 1080), metalworkColor);
add("deck-monitor-barrel", cylinder(215, 28, 10).rotateY(90).translate(-340, 0, 1140), metalworkColor);

add("front-grille", box(26, 220, 64, true).translate(857.000, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(847.000, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(847.000, 165, 215.500), cabPaintColor);

return p.model();
