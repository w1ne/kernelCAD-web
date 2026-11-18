// SPDX-License-Identifier: CC0-1.0
// Hazard response vehicle with high equipment body, storage lockers and exhaust vents. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "hazmat-response-truck",
  license: 'CC0-1.0',
  title: "Hazmat response truck",
  description: "Hazard response vehicle with high equipment body, storage lockers and exhaust vents. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("hazmat-response-truck");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1470, 400, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-525, -201, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-525, -324.2, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-525, -187.8, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-525, 311, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-525, 187.8, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-525, 324.2, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(490, -201, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(490, -324.2, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(490, -187.8, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(490, 311, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(490, 187.8, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(490, 324.2, 155), metalworkColor);
add("crew-cab", box(420, 352, 630, true).translate(507.5, 0, 610), cabPaintColor);
add("windshield", box(92.4, 320, 138.6, true).translate(620.9, 0, 730.8), metalworkColor);
add("side-window--1", box(147, 20, 119.7, true).translate(436.1, -180, 777.45), metalworkColor);
add("side-window-1", box(147, 20, 119.7, true).translate(436.1, 180, 777.45), metalworkColor);
add("cab-roof", box(441, 384, 40, true).translate(507.5, 0, 945), bodyPaintColor);
add("front-bumper", box(115, 536, 95, true).translate(822.5, 0, 177.5), metalworkColor);
add("warning-lightbar", box(310.8, 62, 45, true).translate(507.5, 0, 990.5), cabPaintColor);
add("apparatus-body", box(840, 480, 630, true).translate(-280, 0, 625), bodyPaintColor);
add("compartment--1-0", box(168, 26, 125, true).translate(-523.6, -244.8, 422.5), cabPaintColor);
add("compartment-handle--1-0", box(58.8, 16, 12, true).translate(-502.6, -262.4, 401), metalworkColor);
add("compartment--1-1", box(168, 26, 125, true).translate(-280, -244.8, 532.5), cabPaintColor);
add("compartment-handle--1-1", box(58.8, 16, 12, true).translate(-259, -262.4, 511), metalworkColor);
add("compartment--1-2", box(168, 26, 125, true).translate(-36.4, -244.8, 422.5), cabPaintColor);
add("compartment-handle--1-2", box(58.8, 16, 12, true).translate(-15.4, -262.4, 401), metalworkColor);
add("compartment-1-0", box(168, 26, 125, true).translate(-523.6, 244.8, 422.5), cabPaintColor);
add("compartment-handle-1-0", box(58.8, 16, 12, true).translate(-502.6, 262.4, 401), metalworkColor);
add("compartment-1-1", box(168, 26, 125, true).translate(-280, 244.8, 532.5), cabPaintColor);
add("compartment-handle-1-1", box(58.8, 16, 12, true).translate(-259, 262.4, 511), metalworkColor);
add("compartment-1-2", box(168, 26, 125, true).translate(-36.4, 244.8, 422.5), cabPaintColor);
add("compartment-handle-1-2", box(58.8, 16, 12, true).translate(-15.4, 262.4, 401), metalworkColor);
add("hazmat-storage--1", box(655.2, 25, 315, true).translate(-227.5, -248, 667.5), cabPaintColor);
add("hazmat-storage-1", box(655.2, 25, 315, true).translate(-227.5, 248, 667.5), cabPaintColor);
add("roof-vent-0", cylinder(80, 37, 8).translate(-595, 0, 940), cabPaintColor);
add("roof-vent-1", cylinder(80, 37, 8).translate(-490, 0, 940), cabPaintColor);
add("roof-vent-2", cylinder(80, 37, 8).translate(-385, 0, 940), cabPaintColor);
add("roof-vent-3", cylinder(80, 37, 8).translate(-280, 0, 940), cabPaintColor);

add("front-grille", box(26, 220, 64, true).translate(880.500, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(870.500, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(870.500, 165, 215.500), cabPaintColor);

return p.model();
