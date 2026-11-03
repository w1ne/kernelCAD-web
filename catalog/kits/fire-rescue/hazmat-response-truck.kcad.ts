// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly hazmat response truck scene prop, modeled from scratch.
meta({
  name: "hazmat-response-truck",
  license: 'CC0-1.0',
  title: "Hazmat response truck",
  description: "Hazard response vehicle with high equipment body, storage lockers and exhaust vents. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("hazmat-response-truck");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1470, 400, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-525, -201, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-525, -324.2, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-525, -187.8, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-525, 311, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-525, 187.8, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-525, 324.2, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(490, -201, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(490, -324.2, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(490, -187.8, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(490, 311, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(490, 187.8, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(490, 324.2, 155), accent);
add("crew-cab", box(420, 352, 630, true).translate(507.5, 0, 610), accent);
add("windshield", box(92.4, 320, 138.6, true).translate(620.9, 0, 730.8), body);
add("side-window--1", box(147, 20, 119.7, true).translate(436.1, -180, 777.45), body);
add("side-window-1", box(147, 20, 119.7, true).translate(436.1, 180, 777.45), body);
add("cab-roof", box(441, 384, 40, true).translate(507.5, 0, 945), body);
add("front-bumper", box(115, 536, 95, true).translate(822.5, 0, 177.5), accent);
add("warning-lightbar", box(310.8, 62, 45, true).translate(507.5, 0, 990.5), accent);
add("apparatus-body", box(840, 480, 630, true).translate(-280, 0, 625), body);
add("compartment--1-0", box(168, 26, 125, true).translate(-523.6, -244.8, 422.5), accent);
add("compartment-handle--1-0", box(58.8, 16, 12, true).translate(-502.6, -262.4, 401), body);
add("compartment--1-1", box(168, 26, 125, true).translate(-280, -244.8, 532.5), accent);
add("compartment-handle--1-1", box(58.8, 16, 12, true).translate(-259, -262.4, 511), body);
add("compartment--1-2", box(168, 26, 125, true).translate(-36.4, -244.8, 422.5), accent);
add("compartment-handle--1-2", box(58.8, 16, 12, true).translate(-15.4, -262.4, 401), body);
add("compartment-1-0", box(168, 26, 125, true).translate(-523.6, 244.8, 422.5), accent);
add("compartment-handle-1-0", box(58.8, 16, 12, true).translate(-502.6, 262.4, 401), body);
add("compartment-1-1", box(168, 26, 125, true).translate(-280, 244.8, 532.5), accent);
add("compartment-handle-1-1", box(58.8, 16, 12, true).translate(-259, 262.4, 511), body);
add("compartment-1-2", box(168, 26, 125, true).translate(-36.4, 244.8, 422.5), accent);
add("compartment-handle-1-2", box(58.8, 16, 12, true).translate(-15.4, 262.4, 401), body);
add("hazmat-storage--1", box(655.2, 25, 315, true).translate(-227.5, -248, 667.5), accent);
add("hazmat-storage-1", box(655.2, 25, 315, true).translate(-227.5, 248, 667.5), accent);
add("roof-vent-0", cylinder(80, 37, 8).translate(-595, 0, 940), accent);
add("roof-vent-1", cylinder(80, 37, 8).translate(-490, 0, 940), accent);
add("roof-vent-2", cylinder(80, 37, 8).translate(-385, 0, 940), accent);
add("roof-vent-3", cylinder(80, 37, 8).translate(-280, 0, 940), accent);

return p.model();
