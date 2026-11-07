// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly variable frequency drive cabinet scene prop, modeled from scratch.
meta({
  name: 'variable-frequency-drive-cabinet',
  license: 'CC0-1.0',
  title: 'Variable frequency drive cabinet',
  description: 'Drive cabinet with a large heat-sink back, status display, cooling fan and disconnect handle. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#647881', { label: 'Body color' });
const accent = param('accent', '#e4ab48', { label: 'Accent color' });
const p = assembly('variable-frequency-drive-cabinet');
p.part('plinth', box(429, 280.8, 48, true).translate(0, 0, 24).scale(scale).color(accent));
p.part('enclosure', box(390, 260, 680, true).translate(0, 0, 388).scale(scale).color(body));
p.part('door-0', box(163.8, 14, 557.6, true).translate(-97.5, -132.6, 367.6).scale(scale).color(accent));
p.part('handle-0', box(15, 20, 115.6, true).translate(-46.8, -148.2, 354).scale(scale).color(body));
p.part('vent-slot-0', box(78, 10, 10, true).translate(-117, -140.4, 211.2).scale(scale).color(accent));
p.part('vent-slot-1', box(78, 10, 10, true).translate(-39, -140.4, 211.2).scale(scale).color(accent));
p.part('vent-slot-2', box(78, 10, 10, true).translate(39, -140.4, 211.2).scale(scale).color(accent));
p.part('vent-slot-3', box(78, 10, 10, true).translate(117, -140.4, 211.2).scale(scale).color(accent));
p.part('display', box(97.5, 16, 86, true).translate(97.5, -140.4, 544.4).scale(scale).color(accent));
p.part('indicator-0', cylinder(18, 12, 8).translate(-117, -148.2, 558).scale(scale).color(body));
p.part('indicator-1', cylinder(18, 12, 8).translate(-86, -148.2, 558).scale(scale).color(body));
p.part('indicator-2', cylinder(18, 12, 8).translate(-55, -148.2, 558).scale(scale).color(body));

return p.model();
