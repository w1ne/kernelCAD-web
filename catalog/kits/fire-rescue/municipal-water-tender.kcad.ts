// SPDX-License-Identifier: CC0-1.0
// Water tender with large horizontal tank, rear hose connections and crew cab. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "municipal-water-tender",
  license: 'CC0-1.0',
  title: "Municipal fire water tender",
  description: "Water tender with large horizontal tank, rear hose connections and crew cab. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("municipal-water-tender");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1554, 420, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-573.5, -213.8, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, -337, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, -200.6, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-573.5, 323.8, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, 200.6, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, 337, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(0, -213.8, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, -337, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, -200.6, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(0, 323.8, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, 200.6, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, 337, 155), metalworkColor);
add("road-wheel-2--1", cylinder(110, 155, 10).rotateX(90).translate(573.5, -213.8, 155), tireRubberColor);
add("road-wheel-2--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, -337, 155), metalworkColor);
add("road-wheel-2--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, -200.6, 155), metalworkColor);
add("road-wheel-2-1", cylinder(110, 155, 10).rotateX(90).translate(573.5, 323.8, 155), tireRubberColor);
add("road-wheel-2-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, 200.6, 155), metalworkColor);
add("road-wheel-2-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, 337, 155), metalworkColor);
add("crew-cab", box(444, 369.6, 609, true).translate(536.5, 0, 599.5), cabPaintColor);
add("windshield", box(97.68, 336, 133.98, true).translate(656.38, 0, 716.94), metalworkColor);
add("side-window--1", box(155.4, 20, 115.71, true).translate(461.02, -189, 764.535), metalworkColor);
add("side-window-1", box(155.4, 20, 115.71, true).translate(461.02, 189, 764.535), metalworkColor);
add("cab-roof", box(466.2, 403.2, 40, true).translate(536.5, 0, 924), bodyPaintColor);
add("front-bumper", box(115, 562.8, 95, true).translate(869.5, 0, 177.5), metalworkColor);
add("warning-lightbar", box(328.56, 62, 45, true).translate(536.5, 0, 969.5), cabPaintColor);
add("apparatus-body", box(888, 504, 609, true).translate(-296, 0, 614.5), bodyPaintColor);
add("compartment--1-0", box(177.6, 26, 125, true).translate(-553.52, -257.04, 422.5), cabPaintColor);
add("compartment-handle--1-0", box(62.16, 16, 12, true).translate(-531.32, -275.52, 401), metalworkColor);
add("compartment--1-1", box(177.6, 26, 125, true).translate(-296, -257.04, 532.5), cabPaintColor);
add("compartment-handle--1-1", box(62.16, 16, 12, true).translate(-273.8, -275.52, 511), metalworkColor);
add("compartment--1-2", box(177.6, 26, 125, true).translate(-38.48, -257.04, 422.5), cabPaintColor);
add("compartment-handle--1-2", box(62.16, 16, 12, true).translate(-16.28, -275.52, 401), metalworkColor);
add("compartment-1-0", box(177.6, 26, 125, true).translate(-553.52, 257.04, 422.5), cabPaintColor);
add("compartment-handle-1-0", box(62.16, 16, 12, true).translate(-531.32, 275.52, 401), metalworkColor);
add("compartment-1-1", box(177.6, 26, 125, true).translate(-296, 257.04, 532.5), cabPaintColor);
add("compartment-handle-1-1", box(62.16, 16, 12, true).translate(-273.8, 275.52, 511), metalworkColor);
add("compartment-1-2", box(177.6, 26, 125, true).translate(-38.48, 257.04, 422.5), cabPaintColor);
add("compartment-handle-1-2", box(62.16, 16, 12, true).translate(-16.28, 275.52, 401), metalworkColor);
add("water-tank", cylinder(352.8, 362.5, 12).rotateY(90).translate(-296, 0, 485), cabPaintColor);
add("tank-cradle--1", box(80, 55, 190, true).translate(-296, -168, 465), bodyPaintColor);
add("tank-cradle-1", box(80, 55, 190, true).translate(-296, 168, 465), bodyPaintColor);

add("front-grille", box(26, 220, 64, true).translate(927.500, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(917.500, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(917.500, 165, 215.500), cabPaintColor);

return p.model();
