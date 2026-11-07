// SPDX-License-Identifier: CC0-1.0
// Modern pumper with crew cab, compact pump body and roof-mounted battery equipment pod. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "electric-fire-pumper",
  license: 'CC0-1.0',
  title: "Electric fire pumper",
  description: "Modern pumper with crew cab, compact pump body and roof-mounted battery equipment pod. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("electric-fire-pumper");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1411.2, 400, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-504, -201, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-504, -324.2, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-504, -187.8, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-504, 311, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-504, 187.8, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-504, 324.2, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(470.4, -201, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(470.4, -324.2, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(470.4, -187.8, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(470.4, 311, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(470.4, 187.8, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(470.4, 324.2, 155), metalworkColor);
add("crew-cab", box(403.2, 352, 588, true).translate(487.2, 0, 589), cabPaintColor);
add("windshield", box(88.704, 320, 129.36, true).translate(596.064, 0, 703.08), metalworkColor);
add("side-window--1", box(141.12, 20, 111.72, true).translate(418.656, -180, 751.62), metalworkColor);
add("side-window-1", box(141.12, 20, 111.72, true).translate(418.656, 180, 751.62), metalworkColor);
add("cab-roof", box(423.36, 384, 40, true).translate(487.2, 0, 903), bodyPaintColor);
add("front-bumper", box(115, 536, 95, true).translate(789.6, 0, 177.5), metalworkColor);
add("warning-lightbar", box(298.368, 62, 45, true).translate(487.2, 0, 948.5), cabPaintColor);
add("apparatus-body", box(806.4, 480, 588, true).translate(-268.8, 0, 604), bodyPaintColor);
add("compartment--1-0", box(161.28, 26, 125, true).translate(-502.656, -244.8, 422.5), cabPaintColor);
add("compartment-handle--1-0", box(56.448, 16, 12, true).translate(-482.496, -262.4, 401), metalworkColor);
add("compartment--1-1", box(161.28, 26, 125, true).translate(-268.8, -244.8, 532.5), cabPaintColor);
add("compartment-handle--1-1", box(56.448, 16, 12, true).translate(-248.64, -262.4, 511), metalworkColor);
add("compartment--1-2", box(161.28, 26, 125, true).translate(-34.944, -244.8, 422.5), cabPaintColor);
add("compartment-handle--1-2", box(56.448, 16, 12, true).translate(-14.784, -262.4, 401), metalworkColor);
add("compartment-1-0", box(161.28, 26, 125, true).translate(-502.656, 244.8, 422.5), cabPaintColor);
add("compartment-handle-1-0", box(56.448, 16, 12, true).translate(-482.496, 262.4, 401), metalworkColor);
add("compartment-1-1", box(161.28, 26, 125, true).translate(-268.8, 244.8, 532.5), cabPaintColor);
add("compartment-handle-1-1", box(56.448, 16, 12, true).translate(-248.64, 262.4, 511), metalworkColor);
add("compartment-1-2", box(161.28, 26, 125, true).translate(-34.944, 244.8, 422.5), cabPaintColor);
add("compartment-handle-1-2", box(56.448, 16, 12, true).translate(-14.784, 262.4, 401), metalworkColor);
add("hosebed", box(435.456, 336, 182, true).translate(-218.4, 0, 989), tireRubberColor);
add("pump-control-panel--1", box(161.28, 25, 200, true).translate(25.2, -252.8, 490), metalworkColor);
add("pump-control-panel-1", box(161.28, 25, 200, true).translate(25.2, 252.8, 490), metalworkColor);
add("deck-monitor-base", cylinder(48, 54, 8).translate(-336, 0, 1080), metalworkColor);
add("deck-monitor-barrel", cylinder(215, 28, 10).rotateY(90).translate(-336, 0, 1140), metalworkColor);
add("roof-equipment-pod", box(322.56, 288, 135, true).translate(-201.6, 0, 1030.5), cabPaintColor);

add("front-grille", box(26, 220, 64, true).translate(847.600, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(837.600, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(837.600, 165, 215.500), cabPaintColor);

return p.model();
