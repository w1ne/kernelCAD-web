// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fume exhaust riser scene prop, modeled from scratch.
meta({
  name: 'fume-exhaust-riser',
  license: 'CC0-1.0',
  title: 'Fume exhaust riser',
  description: 'Vertical laboratory exhaust riser with inspection band, support feet and a terminal cap. Knobs: overall scale, body color and accent color.',
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
const p = assembly('fume-exhaust-riser');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('duct-foot', box(546, 546, 45, true).translate(0, 0, 22.5), accent);
add('riser-shaft', box(420, 420, 1980, true).translate(0, 0, 1035), body);
add('inspection-band-0', box(470.4, 470.4, 24, true).translate(0, 0, 172), accent);
add('inspection-band-1', box(470.4, 470.4, 24, true).translate(0, 0, 1072), accent);
add('inspection-band-2', box(470.4, 470.4, 24, true).translate(0, 0, 1972), accent);
add('terminal-cap', box(537.6, 537.6, 90, true).translate(0, 0, 2070), accent);

return p.model();
