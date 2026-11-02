// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly diesel generator set scene prop, modeled from scratch.
meta({
  name: 'diesel-generator-set',
  license: 'CC0-1.0',
  title: 'Diesel generator set',
  description: 'Packaged diesel generator with a sound enclosure, radiator grille, exhaust stack and skid base. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#647880', { label: 'Body color' });
const accent = param('accent', '#e0a23e', { label: 'Accent color' });
const p = assembly('diesel-generator-set');
p.part('base-skid', box(880, 430, 42, true).translate(0, 0, 21).scale(scale).color(accent));
p.part('generator-enclosure', box(739.2, 369.8, 388.8, true).translate(0, 0, 216).scale(scale).color(body));
p.part('radiator-grille', box(28, 318.2, 259.2, true).translate(378.4, 0, 205.2).scale(scale).color(accent));
p.part('grille-bar-0', box(18, 335.4, 12, true).translate(404.8, 0, 108).scale(scale).color(body));
p.part('grille-bar-1', box(18, 335.4, 12, true).translate(404.8, 0, 145.8).scale(scale).color(body));
p.part('grille-bar-2', box(18, 335.4, 12, true).translate(404.8, 0, 183.6).scale(scale).color(body));
p.part('grille-bar-3', box(18, 335.4, 12, true).translate(404.8, 0, 221.4).scale(scale).color(body));
p.part('grille-bar-4', box(18, 335.4, 12, true).translate(404.8, 0, 259.2).scale(scale).color(body));
p.part('exhaust', cylinder(151.2, 28, 10).translate(-272.8, 103.2, 410.4).scale(scale).color(accent));
p.part('exhaust-cap', cylinder(24, 44, 10).translate(-272.8, 103.2, 561.6).scale(scale).color(body));
p.part('service-door', box(12, 206.4, 243, true).translate(-88, -189.2, 232.2).scale(scale).color(accent));
p.part('control-panel', box(18, 90, 120, true).translate(272.8, -202.1, 280.8).scale(scale).color(body));

return p.model();
