// SPDX-License-Identifier: CC0-1.0
// Pickup-based brush response vehicle with skid tank, roll bar and roof lights. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.
meta({
  name: "wildland-brush-truck",
  license: 'CC0-1.0',
  title: "Wildland brush truck",
  description: "Pickup-based brush response vehicle with skid tank, roll bar and roof lights. Material controls: ladder and metalwork, tire rubber, cab and locker finish, apparatus body paint; weathered and highVisibility presets.",
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
const p = assembly("wildland-brush-truck");
const groundOffset = 0;
const add = (name, shape, finish = bodyPaintColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1075.2, 350, 170, true).translate(0, 0, 295), metalworkColor);
add("road-wheel-0--1", cylinder(110, 155, 10).rotateX(90).translate(-384, -169, 155), tireRubberColor);
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-384, -292.2, 155), metalworkColor);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-384, -155.8, 155), metalworkColor);
add("road-wheel-0-1", cylinder(110, 155, 10).rotateX(90).translate(-384, 279, 155), tireRubberColor);
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-384, 155.8, 155), metalworkColor);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(-384, 292.2, 155), metalworkColor);
add("road-wheel-1--1", cylinder(110, 155, 10).rotateX(90).translate(358.4, -169, 155), tireRubberColor);
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(358.4, -292.2, 155), metalworkColor);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(358.4, -155.8, 155), metalworkColor);
add("road-wheel-1-1", cylinder(110, 155, 10).rotateX(90).translate(358.4, 279, 155), tireRubberColor);
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotateX(90).translate(358.4, 155.8, 155), metalworkColor);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotateX(90).translate(358.4, 292.2, 155), metalworkColor);
add("crew-cab", box(358.4, 308, 483, true).translate(371.2, 0, 536.5), cabPaintColor);
add("windshield", box(78.848, 280, 106.26, true).translate(467.968, 0, 633.78), metalworkColor);
add("side-window--1", box(125.44, 20, 91.77, true).translate(310.272, -157.5, 687.045), metalworkColor);
add("side-window-1", box(125.44, 20, 91.77, true).translate(310.272, 157.5, 687.045), metalworkColor);
add("cab-roof", box(376.32, 336, 40, true).translate(371.2, 0, 798), bodyPaintColor);
add("front-bumper", box(115, 469, 95, true).translate(601.6, 0, 177.5), metalworkColor);
add("warning-lightbar", box(265.216, 62, 45, true).translate(371.2, 0, 843.5), cabPaintColor);
add("utility-deck", box(550.4, 441, 175, true).translate(-256, 0, 387.5), bodyPaintColor);
add("skid-water-tank", box(422.4, 336, 253, true).translate(-230.4, 0, 601.5), cabPaintColor);
add("hose-reel", cylinder(85, 150, 10).rotateY(90).translate(-460.8, 0, 510), bodyPaintColor);
add("brush-guard", box(52, 560, 250, true).translate(640, 0, 375), bodyPaintColor);

add("front-grille", box(26, 220, 64, true).translate(659.600, 0, 217.500), metalworkColor);
add("headlamp-near", box(32, 52, 38, true).translate(649.600, -165, 215.500), cabPaintColor);
add("headlamp-far", box(32, 52, 38, true).translate(649.600, 165, 215.500), cabPaintColor);

return p.model();
