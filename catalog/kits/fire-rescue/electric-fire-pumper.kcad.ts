// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly electric fire pumper scene prop, modeled from scratch.
meta({
  name: "electric-fire-pumper",
  license: 'CC0-1.0',
  title: "Electric fire pumper",
  description: "Modern pumper with crew cab, compact pump body and roof-mounted battery equipment pod. Knobs: overall scale, body color and accent color.",
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
const p = assembly("electric-fire-pumper");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1411.2, 400, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-504, -201, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-504, -324.2, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-504, -187.8, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-504, 311, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-504, 187.8, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-504, 324.2, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(470.4, -201, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(470.4, -324.2, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(470.4, -187.8, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(470.4, 311, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(470.4, 187.8, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(470.4, 324.2, 155), accent);
add("crew-cab", box(403.2, 352, 588, true).translate(487.2, 0, 589), accent);
add("windshield", box(88.704, 320, 129.36, true).translate(596.064, 0, 703.08), body);
add("side-window--1", box(141.12, 20, 111.72, true).translate(418.656, -180, 751.62), body);
add("side-window-1", box(141.12, 20, 111.72, true).translate(418.656, 180, 751.62), body);
add("cab-roof", box(423.36, 384, 40, true).translate(487.2, 0, 903), body);
add("front-bumper", box(115, 536, 95, true).translate(789.6, 0, 177.5), accent);
add("warning-lightbar", box(298.368, 62, 45, true).translate(487.2, 0, 948.5), accent);
add("apparatus-body", box(806.4, 480, 588, true).translate(-268.8, 0, 604), body);
add("compartment--1-0", box(161.28, 26, 125, true).translate(-502.656, -244.8, 422.5), accent);
add("compartment-handle--1-0", box(56.448, 16, 12, true).translate(-482.496, -262.4, 401), body);
add("compartment--1-1", box(161.28, 26, 125, true).translate(-268.8, -244.8, 532.5), accent);
add("compartment-handle--1-1", box(56.448, 16, 12, true).translate(-248.64, -262.4, 511), body);
add("compartment--1-2", box(161.28, 26, 125, true).translate(-34.944, -244.8, 422.5), accent);
add("compartment-handle--1-2", box(56.448, 16, 12, true).translate(-14.784, -262.4, 401), body);
add("compartment-1-0", box(161.28, 26, 125, true).translate(-502.656, 244.8, 422.5), accent);
add("compartment-handle-1-0", box(56.448, 16, 12, true).translate(-482.496, 262.4, 401), body);
add("compartment-1-1", box(161.28, 26, 125, true).translate(-268.8, 244.8, 532.5), accent);
add("compartment-handle-1-1", box(56.448, 16, 12, true).translate(-248.64, 262.4, 511), body);
add("compartment-1-2", box(161.28, 26, 125, true).translate(-34.944, 244.8, 422.5), accent);
add("compartment-handle-1-2", box(56.448, 16, 12, true).translate(-14.784, 262.4, 401), body);
add("hosebed", box(435.456, 336, 182, true).translate(-218.4, 0, 989), accent);
add("pump-control-panel--1", box(161.28, 25, 200, true).translate(25.2, -252.8, 490), accent);
add("pump-control-panel-1", box(161.28, 25, 200, true).translate(25.2, 252.8, 490), accent);
add("deck-monitor-base", cylinder(48, 54, 8).translate(-336, 0, 1080), accent);
add("deck-monitor-barrel", cylinder(215, 28, 10).rotate([0, 1, 0], 90).translate(-336, 0, 1140), body);
add("roof-equipment-pod", box(322.56, 288, 135, true).translate(-201.6, 0, 1030.5), accent);

return p.model();
