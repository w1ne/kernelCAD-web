// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly articulated extraction snorkel scene prop, modeled from scratch.
meta({
  name: 'articulated-extraction-snorkel',
  license: 'CC0-1.0',
  title: 'Articulated extraction snorkel',
  description: 'Bench-mounted local extraction arm with a pivot stack, horizontal reach and flared intake hood. Knobs: overall scale, body color and accent color.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#829092', { label: 'Body color' });
const accent = param('accent', '#39a89b', { label: 'Accent color' });
const p = assembly('articulated-extraction-snorkel');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('mounting-base', box(378, 172.8, 55, true).translate(0, 0, 27.5), accent);
add('pedestal', cylinder(459, 30, 8).translate(0, 0, 55), body);
add('lower-arm', box(432, 34, 36, true).translate(162, 0, 485.5), accent);
add('pivot', cylinder(70, 48, 8).translate(378, 0, 442), body);
add('upper-arm', box(387, 30, 32, true).translate(558, 0, 611), body);
add('intake-hood', box(250, 190, 90, true).translate(756, 0, 648.5), accent);
add('intake-flare', box(300, 240, 30, true).translate(756, 0, 567.5), body);

return p.model();
