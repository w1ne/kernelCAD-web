// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fire hose roll scene prop, modeled from scratch.
meta({
  name: "fire-hose-roll",
  license: 'CC0-1.0',
  title: "Fire hose roll",
  description: "Compact rolled attack hose with paired loop bundles and coupling ends. Knobs: overall scale, body color and accent color.",
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
const p = assembly("fire-hose-roll");
const groundOffset = 7;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("hose-loop-0-0", box(114.7, 58, 32, true).rotate([0, 0, 1], -90).translate(185, 0, 44), body);
add("hose-loop-0-1", box(114.7, 58, 32, true).rotate([0, 0, 1], -60).translate(160.215, 92.5, 44), body);
add("hose-loop-0-2", box(114.7, 58, 32, true).rotate([0, 0, 1], -30).translate(92.5, 160.215, 44), body);
add("hose-loop-0-3", box(114.7, 58, 32, true).rotate([0, 0, 1], 0).translate(0, 185, 44), body);
add("hose-loop-0-4", box(114.7, 58, 32, true).rotate([0, 0, 1], 30).translate(-92.5, 160.215, 44), body);
add("hose-loop-0-5", box(114.7, 58, 32, true).rotate([0, 0, 1], 60).translate(-160.215, 92.5, 44), body);
add("hose-loop-0-6", box(114.7, 58, 32, true).rotate([0, 0, 1], 90).translate(-185, 0, 44), body);
add("hose-loop-0-7", box(114.7, 58, 32, true).rotate([0, 0, 1], 120).translate(-160.215, -92.5, 44), body);
add("hose-loop-0-8", box(114.7, 58, 32, true).rotate([0, 0, 1], 150).translate(-92.5, -160.215, 44), body);
add("hose-loop-0-9", box(114.7, 58, 32, true).rotate([0, 0, 1], 180).translate(-0, -185, 44), body);
add("hose-loop-0-10", box(114.7, 58, 32, true).rotate([0, 0, 1], 210).translate(92.5, -160.215, 44), body);
add("hose-loop-0-11", box(114.7, 58, 32, true).rotate([0, 0, 1], 240).translate(160.215, -92.5, 44), body);
add("hose-loop-1-0", box(91.14, 58, 32, true).rotate([0, 0, 1], -90).translate(147, 0, 78), body);
add("hose-loop-1-1", box(91.14, 58, 32, true).rotate([0, 0, 1], -60).translate(127.306, 73.5, 78), body);
add("hose-loop-1-2", box(91.14, 58, 32, true).rotate([0, 0, 1], -30).translate(73.5, 127.306, 78), body);
add("hose-loop-1-3", box(91.14, 58, 32, true).rotate([0, 0, 1], 0).translate(0, 147, 78), body);
add("hose-loop-1-4", box(91.14, 58, 32, true).rotate([0, 0, 1], 30).translate(-73.5, 127.306, 78), body);
add("hose-loop-1-5", box(91.14, 58, 32, true).rotate([0, 0, 1], 60).translate(-127.306, 73.5, 78), body);
add("hose-loop-1-6", box(91.14, 58, 32, true).rotate([0, 0, 1], 90).translate(-147, 0, 78), body);
add("hose-loop-1-7", box(91.14, 58, 32, true).rotate([0, 0, 1], 120).translate(-127.306, -73.5, 78), body);
add("hose-loop-1-8", box(91.14, 58, 32, true).rotate([0, 0, 1], 150).translate(-73.5, -127.306, 78), body);
add("hose-loop-1-9", box(91.14, 58, 32, true).rotate([0, 0, 1], 180).translate(-0, -147, 78), body);
add("hose-loop-1-10", box(91.14, 58, 32, true).rotate([0, 0, 1], 210).translate(73.5, -127.306, 78), body);
add("hose-loop-1-11", box(91.14, 58, 32, true).rotate([0, 0, 1], 240).translate(127.306, -73.5, 78), body);
add("outer-coupling", cylinder(130, 42, 8).rotate([0, 1, 0], 90).translate(237, 0, 35), accent);
add("inner-coupling", cylinder(130, 42, 8).rotate([0, 1, 0], 90).translate(-237, 0, 35), accent);
add("carry-strap", box(85.1, 34, 30, true).translate(0, 0, 425), accent);

return p.model();
