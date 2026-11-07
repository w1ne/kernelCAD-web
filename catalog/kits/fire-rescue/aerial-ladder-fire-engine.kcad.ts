// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly aerial ladder fire engine scene prop, modeled from scratch.
meta({
  name: "aerial-ladder-fire-engine",
  license: 'CC0-1.0',
  title: "Aerial ladder fire engine",
  description: "Fire apparatus with telescoping aerial ladder, stabilizer legs and tip platform. Knobs: overall scale, body color and accent color.",
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
const p = assembly("aerial-ladder-fire-engine");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1554, 410, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-555, -207.4, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-555, -330.6, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-555, -194.2, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-555, 317.4, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-555, 194.2, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-555, 330.6, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(518, -207.4, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(518, -330.6, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(518, -194.2, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(518, 317.4, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(518, 194.2, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(518, 330.6, 155), accent);
add("crew-cab", box(444, 360.8, 651, true).translate(536.5, 0, 620.5), accent);
add("windshield", box(97.68, 328, 143.22, true).translate(656.38, 0, 744.66), body);
add("side-window--1", box(155.4, 20, 123.69, true).translate(461.02, -184.5, 790.365), body);
add("side-window-1", box(155.4, 20, 123.69, true).translate(461.02, 184.5, 790.365), body);
add("cab-roof", box(466.2, 393.6, 40, true).translate(536.5, 0, 966), body);
add("front-bumper", box(115, 549.4, 95, true).translate(869.5, 0, 177.5), accent);
add("warning-lightbar", box(328.56, 62, 45, true).translate(536.5, 0, 1011.5), accent);
add("apparatus-body", box(888, 492, 651, true).translate(-296, 0, 635.5), body);
add("compartment--1-0", box(177.6, 26, 125, true).translate(-553.52, -250.92, 422.5), accent);
add("compartment-handle--1-0", box(62.16, 16, 12, true).translate(-531.32, -268.96, 401), body);
add("compartment--1-1", box(177.6, 26, 125, true).translate(-296, -250.92, 532.5), accent);
add("compartment-handle--1-1", box(62.16, 16, 12, true).translate(-273.8, -268.96, 511), body);
add("compartment--1-2", box(177.6, 26, 125, true).translate(-38.48, -250.92, 422.5), accent);
add("compartment-handle--1-2", box(62.16, 16, 12, true).translate(-16.28, -268.96, 401), body);
add("compartment-1-0", box(177.6, 26, 125, true).translate(-553.52, 250.92, 422.5), accent);
add("compartment-handle-1-0", box(62.16, 16, 12, true).translate(-531.32, 268.96, 401), body);
add("compartment-1-1", box(177.6, 26, 125, true).translate(-296, 250.92, 532.5), accent);
add("compartment-handle-1-1", box(62.16, 16, 12, true).translate(-273.8, 268.96, 511), body);
add("compartment-1-2", box(177.6, 26, 125, true).translate(-38.48, 250.92, 422.5), accent);
add("compartment-handle-1-2", box(62.16, 16, 12, true).translate(-16.28, 268.96, 401), body);
add("stabilizer-beam--1", box(370, 80, 65, true).translate(-370, -360.8, 237.5), accent);
add("stabilizer-foot--1", box(150, 130, 30, true).translate(-370, -377.2, 15), body);
add("stabilizer-beam-1", box(370, 80, 65, true).translate(-370, 360.8, 237.5), accent);
add("stabilizer-foot-1", box(150, 130, 30, true).translate(-370, 377.2, 15), body);
add("ladder-base", box(666, 80, 55, true).rotate([0, 1, 0], -32).translate(-193.88, 0, 1171.7), accent);
add("ladder-fly", box(518, 58, 44, true).rotate([0, 1, 0], -32).translate(229.4, 0, 1412.62), body);
add("ladder-rung--1-0", box(24, 120, 24, true).translate(-407, -54, 1023), body);
add("ladder-rung--1-1", box(24, 120, 24, true).translate(-337.07, -54, 1066.29), body);
add("ladder-rung--1-2", box(24, 120, 24, true).translate(-267.14, -54, 1109.58), body);
add("ladder-rung--1-3", box(24, 120, 24, true).translate(-197.21, -54, 1152.87), body);
add("ladder-rung--1-4", box(24, 120, 24, true).translate(-127.28, -54, 1196.16), body);
add("ladder-rung--1-5", box(24, 120, 24, true).translate(-57.35, -54, 1239.45), body);
add("ladder-rung--1-6", box(24, 120, 24, true).translate(12.58, -54, 1282.74), body);
add("ladder-rung-1-0", box(24, 120, 24, true).translate(-407, 54, 1023), body);
add("ladder-rung-1-1", box(24, 120, 24, true).translate(-337.07, 54, 1066.29), body);
add("ladder-rung-1-2", box(24, 120, 24, true).translate(-267.14, 54, 1109.58), body);
add("ladder-rung-1-3", box(24, 120, 24, true).translate(-197.21, 54, 1152.87), body);
add("ladder-rung-1-4", box(24, 120, 24, true).translate(-127.28, 54, 1196.16), body);
add("ladder-rung-1-5", box(24, 120, 24, true).translate(-57.35, 54, 1239.45), body);
add("ladder-rung-1-6", box(24, 120, 24, true).translate(12.58, 54, 1282.74), body);
add("ladder-tip-platform", box(180, 200, 72, true).translate(549.08, 0, 1641.22), accent);

return p.model();
