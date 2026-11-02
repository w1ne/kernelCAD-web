// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly industrial boiler scene prop, modeled from scratch.
meta({
  name: 'industrial-boiler',
  license: 'CC0-1.0',
  title: 'Industrial boiler',
  description: 'Compact industrial boiler with a firebox, raised flue, burner panel and pipe connections. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#737d82', { label: 'Body color' });
const accent = param('accent', '#dfa741', { label: 'Accent color' });
const p = assembly('industrial-boiler');
p.part('base', box(524.6, 387.2, 42, true).translate(0, 0, 21).scale(scale).color(accent));
p.part('boiler-shell', box(463.6, 334.4, 462.3, true).translate(0, 0, 276).scale(scale).color(body));
p.part('burner-door', box(195.2, 22, 172.5, true).translate(0, -176, 193.2).scale(scale).color(accent));
p.part('flue', cylinder(331.2, 61, 10).translate(140.3, 88, 503.7).scale(scale).color(accent));
p.part('flue-cap', cylinder(24, 97.6, 10).translate(140.3, 88, 821.1).scale(scale).color(body));
p.part('gauge', cylinder(20, 34, 10).rotate([1, 0, 0], 90).translate(-158.6, -157.2, 427.8).scale(scale).color(accent));
p.part('pipe-0', cylinder(183, 18, 10).rotate([0, 1, 0], 90).translate(-317.2, -44, 331.2).scale(scale).color(accent));
p.part('pipe-1', cylinder(183, 18, 10).rotate([0, 1, 0], 90).translate(-317.2, 35.2, 414).scale(scale).color(accent));
p.part('pipe-2', cylinder(183, 18, 10).rotate([0, 1, 0], 90).translate(-317.2, 114.4, 496.8).scale(scale).color(accent));

return p.model();
