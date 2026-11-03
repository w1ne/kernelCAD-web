// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly wildland fire engine scene prop, modeled from scratch.
meta({
  name: "wildland-fire-engine",
  license: 'CC0-1.0',
  title: "Wildland fire engine",
  description: "Off-road fire engine with compact tank, hose reels, brush guard and four-wheel drive stance. Knobs: overall scale, body color and accent color.",
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
const p = assembly("wildland-fire-engine");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1218, 380, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-435, -188.2, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-435, -311.4, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-435, -175, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-435, 298.2, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-435, 175, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-435, 311.4, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(406, -188.2, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(406, -311.4, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(406, -175, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(406, 298.2, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(406, 175, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(406, 311.4, 155), accent);
add("crew-cab", box(348, 334.4, 525, true).translate(420.5, 0, 557.5), accent);
add("windshield", box(76.56, 304, 115.5, true).translate(514.46, 0, 661.5), body);
add("side-window--1", box(121.8, 20, 99.75, true).translate(361.34, -171, 712.875), body);
add("side-window-1", box(121.8, 20, 99.75, true).translate(361.34, 171, 712.875), body);
add("cab-roof", box(365.4, 364.8, 40, true).translate(420.5, 0, 840), body);
add("front-bumper", box(115, 509.2, 95, true).translate(681.5, 0, 177.5), accent);
add("warning-lightbar", box(257.52, 62, 45, true).translate(420.5, 0, 885.5), accent);
add("apparatus-body", box(696, 456, 525, true).translate(-232, 0, 572.5), body);
add("compartment--1-0", box(139.2, 26, 125, true).translate(-433.84, -232.56, 422.5), accent);
add("compartment-handle--1-0", box(48.72, 16, 12, true).translate(-416.44, -249.28, 401), body);
add("compartment--1-1", box(139.2, 26, 125, true).translate(-232, -232.56, 532.5), accent);
add("compartment-handle--1-1", box(48.72, 16, 12, true).translate(-214.6, -249.28, 511), body);
add("compartment--1-2", box(139.2, 26, 125, true).translate(-30.16, -232.56, 422.5), accent);
add("compartment-handle--1-2", box(48.72, 16, 12, true).translate(-12.76, -249.28, 401), body);
add("compartment-1-0", box(139.2, 26, 125, true).translate(-433.84, 232.56, 422.5), accent);
add("compartment-handle-1-0", box(48.72, 16, 12, true).translate(-416.44, 249.28, 401), body);
add("compartment-1-1", box(139.2, 26, 125, true).translate(-232, 232.56, 532.5), accent);
add("compartment-handle-1-1", box(48.72, 16, 12, true).translate(-214.6, 249.28, 511), body);
add("compartment-1-2", box(139.2, 26, 125, true).translate(-30.16, 232.56, 422.5), accent);
add("compartment-handle-1-2", box(48.72, 16, 12, true).translate(-12.76, 249.28, 401), body);
add("high-clearance-guard", box(797.5, 509.2, 100, true).translate(-290, 0, 690), accent);
add("hose-drum--1", cylinder(75, 125, 10).rotate([0, 1, 0], 90).translate(-174, -243.2, 560), accent);
add("hose-drum-1", cylinder(75, 125, 10).rotate([0, 1, 0], 90).translate(-174, 243.2, 560), accent);

return p.model();
