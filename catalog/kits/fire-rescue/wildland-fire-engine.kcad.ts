// SPDX-License-Identifier: CC0-1.0
// Off-road fire engine with compact tank, hose reels, brush guard and four-wheel drive stance. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "wildland-fire-engine",
  license: 'CC0-1.0',
  title: "Wildland fire engine",
  description: "Off-road fire engine with compact tank, hose reels, brush guard and four-wheel drive stance. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("wildland-fire-engine");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1218, 380, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-435, -188.2, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-435, -311.4, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-435, -175, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-435, 298.2, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-435, 175, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-435, 311.4, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(406, -188.2, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(406, -311.4, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(406, -175, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(406, 298.2, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(406, 175, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(406, 311.4, 155), metalworkColor);
add("crew-cab", box(348, 334.4, 525, true).translate(420.5, 0, 557.5), cabPaintColor);
add("windshield", box(76.56, 304, 115.5, true).translate(514.46, 0, 661.5), metalworkColor);
add("side-window--1", box(121.8, 20, 99.75, true).translate(361.34, -171, 712.875), metalworkColor);
add("side-window-1", box(121.8, 20, 99.75, true).translate(361.34, 171, 712.875), metalworkColor);
add("cab-roof", box(365.4, 364.8, 40, true).translate(420.5, 0, 840), bodyPaintColor);
add("front-bumper", box(115, 509.2, 95, true).translate(681.5, 0, 177.5), metalworkColor);
add("warning-lightbar", box(257.52, 62, 45, true).translate(420.5, 0, 885.5), cabPaintColor);
add("apparatus-body", box(696, 456, 525, true).translate(-232, 0, 572.5), bodyPaintColor);
add("compartment--1-0", box(139.2, 26, 125, true).translate(-433.84, -232.56, 422.5), cabPaintColor);
add("compartment-handle--1-0", box(48.72, 16, 12, true).translate(-416.44, -249.28, 401), metalworkColor);
add("compartment--1-1", box(139.2, 26, 125, true).translate(-232, -232.56, 532.5), cabPaintColor);
add("compartment-handle--1-1", box(48.72, 16, 12, true).translate(-214.6, -249.28, 511), metalworkColor);
add("compartment--1-2", box(139.2, 26, 125, true).translate(-30.16, -232.56, 422.5), cabPaintColor);
add("compartment-handle--1-2", box(48.72, 16, 12, true).translate(-12.76, -249.28, 401), metalworkColor);
add("compartment-1-0", box(139.2, 26, 125, true).translate(-433.84, 232.56, 422.5), cabPaintColor);
add("compartment-handle-1-0", box(48.72, 16, 12, true).translate(-416.44, 249.28, 401), metalworkColor);
add("compartment-1-1", box(139.2, 26, 125, true).translate(-232, 232.56, 532.5), cabPaintColor);
add("compartment-handle-1-1", box(48.72, 16, 12, true).translate(-214.6, 249.28, 511), metalworkColor);
add("compartment-1-2", box(139.2, 26, 125, true).translate(-30.16, 232.56, 422.5), cabPaintColor);
add("compartment-handle-1-2", box(48.72, 16, 12, true).translate(-12.76, 249.28, 401), metalworkColor);
add("high-clearance-guard", box(797.5, 509.2, 100, true).translate(-290, 0, 690), cabPaintColor);
add("hose-drum--1", cylinder(75, 125, 10).rotateY(90).translate(-174, -243.2, 560), cabPaintColor);
add("hose-drum-1", cylinder(75, 125, 10).rotateY(90).translate(-174, 243.2, 560), cabPaintColor);

add("front-grille", box(26, 220, 64, true).translate(739.500, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(729.500, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(729.500, 165, 215.500), cabPaintColor);

return p.model();
