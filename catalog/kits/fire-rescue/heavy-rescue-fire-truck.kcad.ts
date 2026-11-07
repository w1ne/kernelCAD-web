// SPDX-License-Identifier: CC0-1.0
// Rescue apparatus with tall equipment body, open side lockers and roof light mast. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "heavy-rescue-fire-truck",
  license: 'CC0-1.0',
  title: "Heavy rescue fire truck",
  description: "Rescue apparatus with tall equipment body, open side lockers and roof light mast. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("heavy-rescue-fire-truck");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1554, 410, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-573.5, -207.4, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, -330.6, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, -194.2, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-573.5, 317.4, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, 194.2, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-573.5, 330.6, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(0, -207.4, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, -330.6, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, -194.2, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(0, 317.4, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, 194.2, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(0, 330.6, 155), metalworkColor);
add("road-wheel-2--1", cylinder(110, 155, 10).rotateX(90).translate(573.5, -207.4, 155), tireRubberColor);
add("road-wheel-2--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, -330.6, 155), metalworkColor);
add("road-wheel-2--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, -194.2, 155), metalworkColor);
add("road-wheel-2-1", cylinder(110, 155, 10).rotateX(90).translate(573.5, 317.4, 155), tireRubberColor);
add("road-wheel-2-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, 194.2, 155), metalworkColor);
add("road-wheel-2-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(573.5, 330.6, 155), metalworkColor);
add("crew-cab", box(444, 360.8, 621.6, true).translate(536.5, 0, 605.8), cabPaintColor);
add("windshield", box(97.68, 328, 136.752, true).translate(656.38, 0, 725.256), metalworkColor);
add("side-window--1", box(155.4, 20, 118.104, true).translate(461.02, -184.5, 772.284), metalworkColor);
add("side-window-1", box(155.4, 20, 118.104, true).translate(461.02, 184.5, 772.284), metalworkColor);
add("cab-roof", box(466.2, 393.6, 40, true).translate(536.5, 0, 936.6), bodyPaintColor);
add("front-bumper", box(115, 549.4, 95, true).translate(869.5, 0, 177.5), metalworkColor);
add("warning-lightbar", box(328.56, 62, 45, true).translate(536.5, 0, 982.1), cabPaintColor);
add("apparatus-body", box(888, 492, 621.6, true).translate(-296, 0, 620.8), bodyPaintColor);
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
add("open-locker--1", box(426.24, 20, 310.8, true).translate(-240.5, -258.3, 745.4), cabPaintColor);
add("rescue-drawer--1-0", box(337.44, 18, 65, true).translate(-240.5, -270.6, 492.5), bodyPaintColor);
add("rescue-drawer--1-1", box(337.44, 18, 65, true).translate(-240.5, -270.6, 597.5), bodyPaintColor);
add("rescue-drawer--1-2", box(337.44, 18, 65, true).translate(-240.5, -270.6, 702.5), bodyPaintColor);
add("open-locker-1", box(426.24, 20, 310.8, true).translate(-240.5, 258.3, 745.4), cabPaintColor);
add("rescue-drawer-1-0", box(337.44, 18, 65, true).translate(-240.5, 270.6, 492.5), bodyPaintColor);
add("rescue-drawer-1-1", box(337.44, 18, 65, true).translate(-240.5, 270.6, 597.5), bodyPaintColor);
add("rescue-drawer-1-2", box(337.44, 18, 65, true).translate(-240.5, 270.6, 702.5), bodyPaintColor);
add("light-mast", box(36, 36, 562.4, true).translate(-277.5, 0, 1212.8), cabPaintColor);
add("mast-lamp", box(170, 95, 65, true).translate(-277.5, 0, 1496.9), bodyPaintColor);

add("front-grille", box(26, 220, 64, true).translate(927.500, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(917.500, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(917.500, 165, 215.500), cabPaintColor);

return p.model();
