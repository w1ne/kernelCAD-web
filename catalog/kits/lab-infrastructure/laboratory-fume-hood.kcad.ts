// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory fume hood scene prop, modeled from scratch.
meta({
  name: 'laboratory-fume-hood',
  license: 'CC0-1.0',
  title: 'Laboratory fume hood',
  description: 'Full-size bench fume enclosure with a work chamber, framed sash, base storage and exhaust crown. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-fume-hood');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('base-cabinet', box(1200, 800, 836, true).translate(0, 0, 418), body);
add('work-surface', box(1248, 840, 34, true).translate(0, 0, 853), accent);
add('side-cheek--1', box(72, 800, 1214, true).translate(-564, 0, 1477), body);
add('side-cheek-1', box(72, 800, 1214, true).translate(564, 0, 1477), body);
add('rear-chamber-wall', box(1056, 64, 1214, true).translate(0, 368, 1477), body);
add('sash-header', box(1200, 30, 100, true).translate(0, -392, 2080), accent);
add('sash-rail', box(1056, 28, 34, true).translate(0, -400, 1399.3), accent);
add('upper-housing', box(1056, 624, 170, true).translate(0, 0, 2115), accent);
add('exhaust-neck', box(264, 176, 150, true).translate(0, 96, 2275), body);
add('control-button-0', box(30, 12, 24, true).translate(-384, -432, 388.2), accent);
add('control-button-1', box(30, 12, 24, true).translate(-264, -432, 388.2), accent);
add('control-button-2', box(30, 12, 24, true).translate(-144, -432, 388.2), accent);

return p.model();
