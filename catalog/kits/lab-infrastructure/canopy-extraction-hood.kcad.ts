// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly canopy extraction hood scene prop, modeled from scratch.
meta({
  name: 'canopy-extraction-hood',
  license: 'CC0-1.0',
  title: 'Canopy extraction hood',
  description: 'Suspended canopy hood with a broad capture canopy, paired posts and raised exhaust outlet. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('canopy-extraction-hood');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('canopy-post--1', box(55, 55, 1600, true).translate(-450, 0, 800), body);
add('canopy-post-1', box(55, 55, 1600, true).translate(450, 0, 800), body);
add('capture-canopy', box(1250, 700, 110, true).translate(0, 0, 1625), accent);
add('canopy-lip', box(1150, 24, 45, true).translate(0, -322, 1522.5), body);
add('exhaust-riser', box(350, 224, 300, true).translate(0, 0, 1830), body);

return p.model();
