// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly orchard air-blast sprayer scene prop, modeled from scratch.
meta({
  name: "orchard-air-blast-sprayer",
  license: 'CC0-1.0',
  title: "Orchard air-blast sprayer",
  description: "Compact orchard sprayer with tank, axial fan ring, nozzle bank and trailer wheels. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('orchard-air-blast-sprayer');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('sprayer-chassis', box(814, 736, 135, true).translate(0, 0, 587.5), body);
add('chemical-tank', box(693, 437, 585, true).translate(0, 34.5, 1117.5), accent);
add('high-wheel--352-0--460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-398, -460, 430), "#414848");
add('high-wheel--352-0--460-0-hub', cylinder(101.2, 146.2, 10).translate(-402.6, -460, 430), accent);
add('high-wheel--352-0-460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(-398, 460, 430), "#414848");
add('high-wheel--352-0-460-0-hub', cylinder(101.2, 146.2, 10).translate(-402.6, 460, 430), accent);
add('high-wheel-352-0--460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(306, -460, 430), "#414848");
add('high-wheel-352-0--460-0-hub', cylinder(101.2, 146.2, 10).translate(301.4, -460, 430), accent);
add('high-wheel-352-0-460-0', cylinder(92, 430, 12).rotate([0, 1, 0], 90).translate(306, 460, 430), "#414848");
add('high-wheel-352-0-460-0-hub', cylinder(101.2, 146.2, 10).translate(301.4, 460, 430), accent);
add('operator-cab', box(462, 460, 510, true).translate(-275, -310.5, 1425), body);
add('cab-window', box(341, 18, 330, true).translate(-275, -552, 1365), accent);

return p.model();
