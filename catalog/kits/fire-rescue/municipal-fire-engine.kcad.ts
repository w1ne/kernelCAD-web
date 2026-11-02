// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly municipal fire engine scene prop, modeled from scratch.
meta({
  name: "municipal-fire-engine",
  license: 'CC0-1.0',
  title: "Municipal fire engine",
  description: "Structural pumper with crew cab, hosebed, side pump panel and deck monitor. Knobs: overall scale, body color and accent color.",
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
const p = assembly("municipal-fire-engine");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1428, 390, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-510, -194.6, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-510, -317.8, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-510, -181.4, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-510, 304.6, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-510, 181.4, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-510, 317.8, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(476, -194.6, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(476, -317.8, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(476, -181.4, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(476, 304.6, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(476, 181.4, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(476, 317.8, 155), accent);
add("crew-cab", box(408, 343.2, 588, true).translate(493, 0, 589), accent);
add("windshield", box(89.76, 312, 129.36, true).translate(603.16, 0, 703.08), body);
add("side-window--1", box(142.8, 20, 111.72, true).translate(423.64, -175.5, 751.62), body);
add("side-window-1", box(142.8, 20, 111.72, true).translate(423.64, 175.5, 751.62), body);
add("cab-roof", box(428.4, 374.4, 40, true).translate(493, 0, 903), body);
add("front-bumper", box(115, 522.6, 95, true).translate(799, 0, 177.5), accent);
add("warning-lightbar", box(301.92, 62, 45, true).translate(493, 0, 948.5), accent);
add("apparatus-body", box(816, 468, 588, true).translate(-272, 0, 604), body);
add("compartment--1-0", box(163.2, 26, 125, true).translate(-508.64, -238.68, 422.5), accent);
add("compartment-handle--1-0", box(57.12, 16, 12, true).translate(-488.24, -255.84, 401), body);
add("compartment--1-1", box(163.2, 26, 125, true).translate(-272, -238.68, 532.5), accent);
add("compartment-handle--1-1", box(57.12, 16, 12, true).translate(-251.6, -255.84, 511), body);
add("compartment--1-2", box(163.2, 26, 125, true).translate(-35.36, -238.68, 422.5), accent);
add("compartment-handle--1-2", box(57.12, 16, 12, true).translate(-14.96, -255.84, 401), body);
add("compartment-1-0", box(163.2, 26, 125, true).translate(-508.64, 238.68, 422.5), accent);
add("compartment-handle-1-0", box(57.12, 16, 12, true).translate(-488.24, 255.84, 401), body);
add("compartment-1-1", box(163.2, 26, 125, true).translate(-272, 238.68, 532.5), accent);
add("compartment-handle-1-1", box(57.12, 16, 12, true).translate(-251.6, 255.84, 511), body);
add("compartment-1-2", box(163.2, 26, 125, true).translate(-35.36, 238.68, 422.5), accent);
add("compartment-handle-1-2", box(57.12, 16, 12, true).translate(-14.96, 255.84, 401), body);
add("hosebed", box(440.64, 327.6, 182, true).translate(-221, 0, 989), accent);
add("pump-control-panel--1", box(163.2, 25, 200, true).translate(25.5, -246.48, 490), accent);
add("pump-control-panel-1", box(163.2, 25, 200, true).translate(25.5, 246.48, 490), accent);
add("deck-monitor-base", cylinder(48, 54, 8).translate(-340, 0, 1080), accent);
add("deck-monitor-barrel", cylinder(215, 28, 10).rotate([0, 1, 0], 90).translate(-340, 0, 1140), body);

return p.model();
