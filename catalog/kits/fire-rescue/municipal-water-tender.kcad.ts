// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly municipal fire water tender scene prop, modeled from scratch.
meta({
  name: "municipal-water-tender",
  license: 'CC0-1.0',
  title: "Municipal fire water tender",
  description: "Water tender with large horizontal tank, rear hose connections and crew cab. Knobs: overall scale, body color and accent color.",
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
const p = assembly("municipal-water-tender");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1554, 420, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-573.5, -213.8, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-573.5, -337, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-573.5, -200.6, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-573.5, 323.8, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-573.5, 200.6, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-573.5, 337, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(0, -213.8, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, -337, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, -200.6, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(0, 323.8, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, 200.6, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, 337, 155), accent);
add("road-wheel-2--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(573.5, -213.8, 155), "#30363b");
add("road-wheel-2--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(573.5, -337, 155), accent);
add("road-wheel-2--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(573.5, -200.6, 155), accent);
add("road-wheel-2-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(573.5, 323.8, 155), "#30363b");
add("road-wheel-2-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(573.5, 200.6, 155), accent);
add("road-wheel-2-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(573.5, 337, 155), accent);
add("crew-cab", box(444, 369.6, 609, true).translate(536.5, 0, 599.5), accent);
add("windshield", box(97.68, 336, 133.98, true).translate(656.38, 0, 716.94), body);
add("side-window--1", box(155.4, 20, 115.71, true).translate(461.02, -189, 764.535), body);
add("side-window-1", box(155.4, 20, 115.71, true).translate(461.02, 189, 764.535), body);
add("cab-roof", box(466.2, 403.2, 40, true).translate(536.5, 0, 924), body);
add("front-bumper", box(115, 562.8, 95, true).translate(869.5, 0, 177.5), accent);
add("warning-lightbar", box(328.56, 62, 45, true).translate(536.5, 0, 969.5), accent);
add("apparatus-body", box(888, 504, 609, true).translate(-296, 0, 614.5), body);
add("compartment--1-0", box(177.6, 26, 125, true).translate(-553.52, -257.04, 422.5), accent);
add("compartment-handle--1-0", box(62.16, 16, 12, true).translate(-531.32, -275.52, 401), body);
add("compartment--1-1", box(177.6, 26, 125, true).translate(-296, -257.04, 532.5), accent);
add("compartment-handle--1-1", box(62.16, 16, 12, true).translate(-273.8, -275.52, 511), body);
add("compartment--1-2", box(177.6, 26, 125, true).translate(-38.48, -257.04, 422.5), accent);
add("compartment-handle--1-2", box(62.16, 16, 12, true).translate(-16.28, -275.52, 401), body);
add("compartment-1-0", box(177.6, 26, 125, true).translate(-553.52, 257.04, 422.5), accent);
add("compartment-handle-1-0", box(62.16, 16, 12, true).translate(-531.32, 275.52, 401), body);
add("compartment-1-1", box(177.6, 26, 125, true).translate(-296, 257.04, 532.5), accent);
add("compartment-handle-1-1", box(62.16, 16, 12, true).translate(-273.8, 275.52, 511), body);
add("compartment-1-2", box(177.6, 26, 125, true).translate(-38.48, 257.04, 422.5), accent);
add("compartment-handle-1-2", box(62.16, 16, 12, true).translate(-16.28, 275.52, 401), body);
add("water-tank", cylinder(352.8, 362.5, 12).rotate([0, 1, 0], 90).translate(-296, 0, 485), accent);
add("tank-cradle--1", box(80, 55, 190, true).translate(-296, -168, 465), body);
add("tank-cradle-1", box(80, 55, 190, true).translate(-296, 168, 465), body);

return p.model();
