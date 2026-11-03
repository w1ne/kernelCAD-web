// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly quint fire apparatus scene prop, modeled from scratch.
meta({
  name: "quint-fire-apparatus",
  license: 'CC0-1.0',
  title: "Quint fire apparatus",
  description: "Combined pumper and aerial apparatus with hosebed, pump panel and mounted ladder. Knobs: overall scale, body color and accent color.",
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
const p = assembly("quint-fire-apparatus");
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
add("crew-cab", box(444, 360.8, 630, true).translate(536.5, 0, 610), accent);
add("windshield", box(97.68, 328, 138.6, true).translate(656.38, 0, 730.8), body);
add("side-window--1", box(155.4, 20, 119.7, true).translate(461.02, -184.5, 777.45), body);
add("side-window-1", box(155.4, 20, 119.7, true).translate(461.02, 184.5, 777.45), body);
add("cab-roof", box(466.2, 393.6, 40, true).translate(536.5, 0, 945), body);
add("front-bumper", box(115, 549.4, 95, true).translate(869.5, 0, 177.5), accent);
add("warning-lightbar", box(328.56, 62, 45, true).translate(536.5, 0, 990.5), accent);
add("apparatus-body", box(888, 492, 630, true).translate(-296, 0, 625), body);
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
add("hosebed", box(479.52, 344.4, 195, true).translate(-240.5, 0, 1037.5), accent);
add("pump-control-panel--1", box(177.6, 25, 200, true).translate(27.75, -259.12, 490), accent);
add("pump-control-panel-1", box(177.6, 25, 200, true).translate(27.75, 259.12, 490), accent);
add("deck-monitor-base", cylinder(48, 54, 8).translate(-370, 0, 1135), accent);
add("deck-monitor-barrel", cylinder(215, 28, 10).rotate([0, 1, 0], 90).translate(-370, 0, 1195), body);
add("stabilizer-beam--1", box(370, 80, 65, true).translate(-370, -360.8, 237.5), accent);
add("stabilizer-foot--1", box(150, 130, 30, true).translate(-370, -377.2, 15), body);
add("stabilizer-beam-1", box(370, 80, 65, true).translate(-370, 360.8, 237.5), accent);
add("stabilizer-foot-1", box(150, 130, 30, true).translate(-370, 377.2, 15), body);
add("ladder-base", box(666, 80, 55, true).rotate([0, 1, 0], -32).translate(-193.88, 0, 1150.7), accent);
add("ladder-fly", box(518, 58, 44, true).rotate([0, 1, 0], -32).translate(229.4, 0, 1391.62), body);
add("ladder-rung--1-0", box(24, 120, 24, true).translate(-407, -54, 1002), body);
add("ladder-rung--1-1", box(24, 120, 24, true).translate(-337.07, -54, 1045.29), body);
add("ladder-rung--1-2", box(24, 120, 24, true).translate(-267.14, -54, 1088.58), body);
add("ladder-rung--1-3", box(24, 120, 24, true).translate(-197.21, -54, 1131.87), body);
add("ladder-rung--1-4", box(24, 120, 24, true).translate(-127.28, -54, 1175.16), body);
add("ladder-rung--1-5", box(24, 120, 24, true).translate(-57.35, -54, 1218.45), body);
add("ladder-rung--1-6", box(24, 120, 24, true).translate(12.58, -54, 1261.74), body);
add("ladder-rung-1-0", box(24, 120, 24, true).translate(-407, 54, 1002), body);
add("ladder-rung-1-1", box(24, 120, 24, true).translate(-337.07, 54, 1045.29), body);
add("ladder-rung-1-2", box(24, 120, 24, true).translate(-267.14, 54, 1088.58), body);
add("ladder-rung-1-3", box(24, 120, 24, true).translate(-197.21, 54, 1131.87), body);
add("ladder-rung-1-4", box(24, 120, 24, true).translate(-127.28, 54, 1175.16), body);
add("ladder-rung-1-5", box(24, 120, 24, true).translate(-57.35, 54, 1218.45), body);
add("ladder-rung-1-6", box(24, 120, 24, true).translate(12.58, 54, 1261.74), body);
add("ladder-tip-platform", box(180, 200, 72, true).translate(549.08, 0, 1620.22), accent);

return p.model();
