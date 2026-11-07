// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tiller ladder fire truck scene prop, modeled from scratch.
meta({
  name: "tiller-ladder-fire-truck",
  license: 'CC0-1.0',
  title: "Tiller ladder fire truck",
  description: "Long aerial ladder apparatus with rear tiller cab and multi-axle chassis. Knobs: overall scale, body color and accent color.",
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
const p = assembly("tiller-ladder-fire-truck");
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("frame", box(1722, 410, 170, true).translate(0, 0, 295), body);
add("road-wheel-0--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-635.5, -207.4, 155), "#30363b");
add("road-wheel-0--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-635.5, -330.6, 155), accent);
add("road-wheel-0--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-635.5, -194.2, 155), accent);
add("road-wheel-0-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(-635.5, 317.4, 155), "#30363b");
add("road-wheel-0-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-635.5, 194.2, 155), accent);
add("road-wheel-0-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(-635.5, 330.6, 155), accent);
add("road-wheel-1--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(0, -207.4, 155), "#30363b");
add("road-wheel-1--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, -330.6, 155), accent);
add("road-wheel-1--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, -194.2, 155), accent);
add("road-wheel-1-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(0, 317.4, 155), "#30363b");
add("road-wheel-1-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, 194.2, 155), accent);
add("road-wheel-1-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(0, 330.6, 155), accent);
add("road-wheel-2--1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(635.5, -207.4, 155), "#30363b");
add("road-wheel-2--1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(635.5, -330.6, 155), accent);
add("road-wheel-2--1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(635.5, -194.2, 155), accent);
add("road-wheel-2-1", cylinder(110, 155, 10).rotate([1, 0, 0], 90).translate(635.5, 317.4, 155), "#30363b");
add("road-wheel-2-1-hub--1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(635.5, 194.2, 155), accent);
add("road-wheel-2-1-hub-1", cylinder(15.4, 55.8, 8).rotate([1, 0, 0], 90).translate(635.5, 330.6, 155), accent);
add("crew-cab", box(492, 360.8, 651, true).translate(594.5, 0, 620.5), accent);
add("windshield", box(108.24, 328, 143.22, true).translate(727.34, 0, 744.66), body);
add("side-window--1", box(172.2, 20, 123.69, true).translate(510.86, -184.5, 790.365), body);
add("side-window-1", box(172.2, 20, 123.69, true).translate(510.86, 184.5, 790.365), body);
add("cab-roof", box(516.6, 393.6, 40, true).translate(594.5, 0, 966), body);
add("front-bumper", box(115, 549.4, 95, true).translate(963.5, 0, 177.5), accent);
add("warning-lightbar", box(364.08, 62, 45, true).translate(594.5, 0, 1011.5), accent);
add("apparatus-body", box(984, 492, 651, true).translate(-328, 0, 635.5), body);
add("compartment--1-0", box(196.8, 26, 125, true).translate(-613.36, -250.92, 422.5), accent);
add("compartment-handle--1-0", box(68.88, 16, 12, true).translate(-588.76, -268.96, 401), body);
add("compartment--1-1", box(196.8, 26, 125, true).translate(-328, -250.92, 532.5), accent);
add("compartment-handle--1-1", box(68.88, 16, 12, true).translate(-303.4, -268.96, 511), body);
add("compartment--1-2", box(196.8, 26, 125, true).translate(-42.64, -250.92, 422.5), accent);
add("compartment-handle--1-2", box(68.88, 16, 12, true).translate(-18.04, -268.96, 401), body);
add("compartment-1-0", box(196.8, 26, 125, true).translate(-613.36, 250.92, 422.5), accent);
add("compartment-handle-1-0", box(68.88, 16, 12, true).translate(-588.76, 268.96, 401), body);
add("compartment-1-1", box(196.8, 26, 125, true).translate(-328, 250.92, 532.5), accent);
add("compartment-handle-1-1", box(68.88, 16, 12, true).translate(-303.4, 268.96, 511), body);
add("compartment-1-2", box(196.8, 26, 125, true).translate(-42.64, 250.92, 422.5), accent);
add("compartment-handle-1-2", box(68.88, 16, 12, true).translate(-18.04, 268.96, 401), body);
add("ladder-base", box(738, 80, 55, true).rotate([0, 1, 0], -32).translate(-214.84, 0, 1186.1), accent);
add("ladder-fly", box(574, 58, 44, true).rotate([0, 1, 0], -32).translate(254.2, 0, 1453.66), body);
add("ladder-rung--1-0", box(24, 120, 24, true).translate(-451, -54, 1023), body);
add("ladder-rung--1-1", box(24, 120, 24, true).translate(-373.51, -54, 1070.97), body);
add("ladder-rung--1-2", box(24, 120, 24, true).translate(-296.02, -54, 1118.94), body);
add("ladder-rung--1-3", box(24, 120, 24, true).translate(-218.53, -54, 1166.91), body);
add("ladder-rung--1-4", box(24, 120, 24, true).translate(-141.04, -54, 1214.88), body);
add("ladder-rung--1-5", box(24, 120, 24, true).translate(-63.55, -54, 1262.85), body);
add("ladder-rung--1-6", box(24, 120, 24, true).translate(13.94, -54, 1310.82), body);
add("ladder-rung-1-0", box(24, 120, 24, true).translate(-451, 54, 1023), body);
add("ladder-rung-1-1", box(24, 120, 24, true).translate(-373.51, 54, 1070.97), body);
add("ladder-rung-1-2", box(24, 120, 24, true).translate(-296.02, 54, 1118.94), body);
add("ladder-rung-1-3", box(24, 120, 24, true).translate(-218.53, 54, 1166.91), body);
add("ladder-rung-1-4", box(24, 120, 24, true).translate(-141.04, 54, 1214.88), body);
add("ladder-rung-1-5", box(24, 120, 24, true).translate(-63.55, 54, 1262.85), body);
add("ladder-rung-1-6", box(24, 120, 24, true).translate(13.94, 54, 1310.82), body);
add("ladder-tip-platform", box(180, 200, 72, true).translate(608.44, 0, 1705.46), accent);
add("rear-tiller-cab", box(328, 328, 434, true).translate(-1004.5, 0, 542), accent);

return p.model();
