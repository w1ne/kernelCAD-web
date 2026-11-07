// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly offset disc harrow scene prop, modeled from scratch.
meta({
  name: "offset-disc-harrow",
  license: 'CC0-1.0',
  title: "Offset disc harrow",
  description: "Offset disc harrow with paired gangs, frame beam and transport wheels. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('offset-disc-harrow');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1850, 110, 94, true).translate(0, 120, 414.2), accent);
add('drawbar', box(135, 560, 70, true).translate(0, 430, 456.6), body);
add('transport-wheel--1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(642, -230, 120), "#414848");
add('transport-wheel--1-hub', cylinder(93.5, 40.8, 10).translate(637.75, -230, 120), accent);
add('transport-wheel-1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(642, 230, 120), "#414848");
add('transport-wheel-1-hub', cylinder(93.5, 40.8, 10).translate(637.75, 230, 120), accent);
add('disc--1-0', cylinder(30, 142, 10).translate(-703, -220, 40), body);
add('disc-scraper--1-0', box(16, 180, 220, true).translate(-703, -220, 280), accent);
add('disc--1-1', cylinder(30, 142, 10).translate(-234.333, -220, 40), body);
add('disc-scraper--1-1', box(16, 180, 220, true).translate(-234.333, -220, 280), accent);
add('disc--1-2', cylinder(30, 142, 10).translate(234.333, -220, 40), body);
add('disc-scraper--1-2', box(16, 180, 220, true).translate(234.333, -220, 280), accent);
add('disc--1-3', cylinder(30, 142, 10).translate(703, -220, 40), body);
add('disc-scraper--1-3', box(16, 180, 220, true).translate(703, -220, 280), accent);
add('disc-1-0', cylinder(30, 142, 10).translate(-703, 220, 40), body);
add('disc-scraper-1-0', box(16, 180, 220, true).translate(-703, 220, 280), accent);
add('disc-1-1', cylinder(30, 142, 10).translate(-234.333, 220, 40), body);
add('disc-scraper-1-1', box(16, 180, 220, true).translate(-234.333, 220, 280), accent);
add('disc-1-2', cylinder(30, 142, 10).translate(234.333, 220, 40), body);
add('disc-scraper-1-2', box(16, 180, 220, true).translate(234.333, 220, 280), accent);
add('disc-1-3', cylinder(30, 142, 10).translate(703, 220, 40), body);
add('disc-scraper-1-3', box(16, 180, 220, true).translate(703, 220, 280), accent);

return p.model();
