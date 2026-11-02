// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly land-leveling scraper scene prop, modeled from scratch.
meta({
  name: "land-leveling-scraper",
  license: 'CC0-1.0',
  title: "Land-leveling scraper",
  description: "Tractor-pulled land scraper with a deep open bowl, side cheeks and cutting edge. Knobs: overall scale, body color and accent color.",
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
const p = assembly('land-leveling-scraper');
const groundOffset = 55;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(1450, 110, 94, true).translate(0, 120, 425), accent);
add('drawbar', box(135, 560, 70, true).translate(0, 430, 469), body);
add('scraper-bowl-floor', box(1189, 550, 40, true).translate(0, -80, 195), body);
add('bowl-side--1', box(65, 680, 546, true).translate(-551, 0, 553), accent);
add('bowl-side-1', box(65, 680, 546, true).translate(551, 0, 553), accent);
add('cutting-edge', box(1247, 46, 54, true).translate(0, -420, 82), body);

return p.model();
