// SPDX-License-Identifier: CC0-1.0
// Fire apparatus with telescoping aerial ladder, stabilizer legs and tip platform. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "aerial-ladder-fire-engine",
  license: 'CC0-1.0',
  title: "Aerial ladder fire engine",
  description: "Fire apparatus with telescoping aerial ladder, stabilizer legs and tip platform. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("aerial-ladder-fire-engine");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1554, 410, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-555, -207.4, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-555, -330.6, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-555, -194.2, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-555, 317.4, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-555, 194.2, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-555, 330.6, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(518, -207.4, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(518, -330.6, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(518, -194.2, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(518, 317.4, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(518, 194.2, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(518, 330.6, 155), metalworkColor);
add("crew-cab", box(444, 360.8, 651, true).translate(536.5, 0, 620.5), cabPaintColor);
add("windshield", box(97.68, 328, 143.22, true).translate(656.38, 0, 744.66), metalworkColor);
add("side-window--1", box(155.4, 20, 123.69, true).translate(461.02, -184.5, 790.365), metalworkColor);
add("side-window-1", box(155.4, 20, 123.69, true).translate(461.02, 184.5, 790.365), metalworkColor);
add("cab-roof", box(466.2, 393.6, 40, true).translate(536.5, 0, 966), bodyPaintColor);
add("front-bumper", box(115, 549.4, 95, true).translate(869.5, 0, 177.5), metalworkColor);
add("warning-lightbar", box(328.56, 62, 45, true).translate(536.5, 0, 1011.5), cabPaintColor);
add("apparatus-body", box(888, 492, 651, true).translate(-296, 0, 635.5), bodyPaintColor);
add("compartment--1-0", box(177.6, 26, 125, true).translate(-553.52, -250.92, 422.5), cabPaintColor);
add("compartment-handle--1-0", box(62.16, 16, 12, true).translate(-531.32, -268.96, 401), metalworkColor);
add("compartment--1-1", box(177.6, 26, 125, true).translate(-296, -250.92, 532.5), cabPaintColor);
add("compartment-handle--1-1", box(62.16, 16, 12, true).translate(-273.8, -268.96, 511), metalworkColor);
add("compartment--1-2", box(177.6, 26, 125, true).translate(-38.48, -250.92, 422.5), cabPaintColor);
add("compartment-handle--1-2", box(62.16, 16, 12, true).translate(-16.28, -268.96, 401), metalworkColor);
add("compartment-1-0", box(177.6, 26, 125, true).translate(-553.52, 250.92, 422.5), cabPaintColor);
add("compartment-handle-1-0", box(62.16, 16, 12, true).translate(-531.32, 268.96, 401), metalworkColor);
add("compartment-1-1", box(177.6, 26, 125, true).translate(-296, 250.92, 532.5), cabPaintColor);
add("compartment-handle-1-1", box(62.16, 16, 12, true).translate(-273.8, 268.96, 511), metalworkColor);
add("compartment-1-2", box(177.6, 26, 125, true).translate(-38.48, 250.92, 422.5), cabPaintColor);
add("compartment-handle-1-2", box(62.16, 16, 12, true).translate(-16.28, 268.96, 401), metalworkColor);
add("stabilizer-beam--1", box(370, 80, 65, true).translate(-370, -360.8, 237.5), metalworkColor);
add("stabilizer-foot--1", box(150, 130, 30, true).translate(-370, -377.2, 15), metalworkColor);
add("stabilizer-beam-1", box(370, 80, 65, true).translate(-370, 360.8, 237.5), metalworkColor);
add("stabilizer-foot-1", box(150, 130, 30, true).translate(-370, 377.2, 15), metalworkColor);
add("ladder-base", box(666, 80, 55, true).rotateY(-32).translate(-193.88, 0, 1171.7), metalworkColor);
add("ladder-fly", box(518, 58, 44, true).rotateY(-32).translate(229.4, 0, 1412.62), metalworkColor);
add("ladder-rung--1-0", box(24, 120, 24, true).translate(-407, -54, 1023), metalworkColor);
add("ladder-rung--1-1", box(24, 120, 24, true).translate(-337.07, -54, 1066.29), metalworkColor);
add("ladder-rung--1-2", box(24, 120, 24, true).translate(-267.14, -54, 1109.58), metalworkColor);
add("ladder-rung--1-3", box(24, 120, 24, true).translate(-197.21, -54, 1152.87), metalworkColor);
add("ladder-rung--1-4", box(24, 120, 24, true).translate(-127.28, -54, 1196.16), metalworkColor);
add("ladder-rung--1-5", box(24, 120, 24, true).translate(-57.35, -54, 1239.45), metalworkColor);
add("ladder-rung--1-6", box(24, 120, 24, true).translate(12.58, -54, 1282.74), metalworkColor);
add("ladder-rung-1-0", box(24, 120, 24, true).translate(-407, 54, 1023), metalworkColor);
add("ladder-rung-1-1", box(24, 120, 24, true).translate(-337.07, 54, 1066.29), metalworkColor);
add("ladder-rung-1-2", box(24, 120, 24, true).translate(-267.14, 54, 1109.58), metalworkColor);
add("ladder-rung-1-3", box(24, 120, 24, true).translate(-197.21, 54, 1152.87), metalworkColor);
add("ladder-rung-1-4", box(24, 120, 24, true).translate(-127.28, 54, 1196.16), metalworkColor);
add("ladder-rung-1-5", box(24, 120, 24, true).translate(-57.35, 54, 1239.45), metalworkColor);
add("ladder-rung-1-6", box(24, 120, 24, true).translate(12.58, 54, 1282.74), metalworkColor);
add("ladder-tip-platform", box(180, 200, 72, true).translate(449.044, 0, 1607.869), metalworkColor);

add("front-grille", box(26, 220, 64, true).translate(927.500, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(917.500, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(917.500, 165, 215.500), cabPaintColor);


add("stabilizer-jack--1", box(70, 70, 180, true).translate(-370, -377.2, 117), metalworkColor);
add("stabilizer-jack-1", box(70, 70, 180, true).translate(-370, 377.2, 117), metalworkColor);

return p.model();
