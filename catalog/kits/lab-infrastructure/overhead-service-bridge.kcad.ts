// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly overhead laboratory service bridge scene prop, modeled from scratch.
meta({
  name: 'overhead-service-bridge',
  license: 'CC0-1.0',
  title: 'Overhead laboratory service bridge',
  description: 'Raised service bridge with twin support posts, cable tray and parallel utility lines. Knobs: overall scale, body color and accent color.',
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
const p = assembly('overhead-service-bridge');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('support-post--1', box(50, 55, 1250, true).translate(-645, 0, 625), body);
add('base-foot--1', box(170, 150, 24, true).translate(-645, 0, 12), accent);
add('support-post-1', box(50, 55, 1250, true).translate(645, 0, 625), body);
add('base-foot-1', box(170, 150, 24, true).translate(645, 0, 12), accent);
add('carrier-rail', box(1500, 152, 80, true).translate(0, 0, 1210), accent);
add('service-line-0', box(1410, 24, 24, true).translate(0, -106.4, 1112), body);
add('service-line-1', box(1410, 24, 24, true).translate(0, -35.467, 1084), body);
add('service-line-2', box(1410, 24, 24, true).translate(0, 35.467, 1056), body);
add('service-line-3', box(1410, 24, 24, true).translate(0, 106.4, 1028), body);

return p.model();
