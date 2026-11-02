// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly wildland brush truck scene prop, modeled from scratch.
meta({
  name: "wildland-brush-truck",
  license: 'CC0-1.0',
  title: "Wildland brush truck",
  description: "Pickup-based brush response vehicle with skid tank, roll bar and roof lights. Knobs: overall scale, body color and accent color.",
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
const p = assembly("wildland-brush-truck");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1075.2, 350, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-384, -169, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-384, -292.2, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-384, -155.8, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-384, 279, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-384, 155.8, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-384, 292.2, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(358.4, -169, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(358.4, -292.2, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(358.4, -155.8, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(358.4, 279, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(358.4, 155.8, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(358.4, 292.2, 155), accent);
add("crew-cab", box(358.4, 308, 483, true).translate(371.2, 0, 536.5), accent);
add("windshield", box(78.848, 280, 106.26, true).translate(467.968, 0, 633.78), body);
add("side-window--1", box(125.44, 20, 91.77, true).translate(310.272, -157.5, 687.045), body);
add("side-window-1", box(125.44, 20, 91.77, true).translate(310.272, 157.5, 687.045), body);
add("cab-roof", box(376.32, 336, 40, true).translate(371.2, 0, 798), body);
add("front-bumper", box(115, 469, 95, true).translate(601.6, 0, 177.5), accent);
add("warning-lightbar", box(265.216, 62, 45, true).translate(371.2, 0, 843.5), accent);
add("utility-deck", box(550.4, 441, 175, true).translate(-256, 0, 387.5), body);
add("skid-water-tank", box(422.4, 336, 253, true).translate(-230.4, 0, 601.5), accent);
add("hose-reel", cylinder(85, 150, 10).rotate([0, 1, 0], 90).translate(-460.8, 0, 510), body);
add("brush-guard", box(52, 560, 250, true).translate(640, 0, 375), body);

return p.model();
