// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly ceiling service carrier scene prop, modeled from scratch.
meta({
  name: 'ceiling-service-carrier',
  license: 'CC0-1.0',
  title: 'Ceiling service carrier',
  description: 'Ceiling-hung carrier rail with end hangers, utility tray and repeating service drops. Knobs: overall scale, body color and accent color.',
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
const p = assembly('ceiling-service-carrier');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('support-post--1', box(50, 55, 1500, true).translate(-774, 0, 750), body);
add('base-foot--1', box(170, 150, 24, true).translate(-774, 0, 12), accent);
add('support-post-1', box(50, 55, 1500, true).translate(774, 0, 750), body);
add('base-foot-1', box(170, 150, 24, true).translate(774, 0, 12), accent);
add('carrier-rail', box(1800, 120, 80, true).translate(0, 0, 1460), accent);
add('service-line-0', box(1692, 24, 24, true).translate(0, -84, 1362), body);
add('service-line-1', box(1692, 24, 24, true).translate(0, 0, 1334), body);
add('service-line-2', box(1692, 24, 24, true).translate(0, 84, 1306), body);
add('service-drop-0', box(28, 28, 1320, true).translate(-648, 0, 750), accent);
add('service-drop-1', box(28, 28, 1320, true).translate(-216, 0, 750), accent);
add('service-drop-2', box(28, 28, 1320, true).translate(216, 0, 750), accent);
add('service-drop-3', box(28, 28, 1320, true).translate(648, 0, 750), accent);

return p.model();
