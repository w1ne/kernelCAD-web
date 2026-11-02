// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly centrifugal chiller scene prop, modeled from scratch.
meta({
  name: 'centrifugal-chiller',
  license: 'CC0-1.0',
  title: 'Centrifugal chiller',
  description: 'Industrial chiller package with two compressor domes, condenser barrels and pipe connections. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#657c83', { label: 'Body color' });
const accent = param('accent', '#e4a940', { label: 'Accent color' });
const p = assembly('centrifugal-chiller');
p.part('base-frame', box(780, 490, 35, true).translate(0, 0, 18).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('main-casing', box(717.6, 441, 360, true).translate(0, 0, 200).translate(0, 0, -0.5).scale(scale).color(body));
p.part('service-section-0', box(179.4, 455.7, 290, true).translate(-234, 0, 205).translate(0, 0, -0.5).scale(scale).color(body));
p.part('inspection-door-0', box(101.4, 14, 150, true).translate(-234, -230.3, 200).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('service-section-1', box(179.4, 455.7, 290, true).translate(0, 0, 205).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('inspection-door-1', box(101.4, 14, 150, true).translate(0, -230.3, 200).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('compressor-dome-0', cylinder(175, 63.7, 12).translate(-241.8, 0, 390).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('compressor-dome-1', cylinder(175, 63.7, 12).translate(241.8, 0, 390).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('support-foot-0', box(55, 45, 85, true).translate(-304.2, -176.4, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('support-foot-1', box(55, 45, 85, true).translate(304.2, -176.4, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('support-foot-2', box(55, 45, 85, true).translate(-304.2, 176.4, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('support-foot-3', box(55, 45, 85, true).translate(304.2, 176.4, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('pipe-header', cylinder(249.6, 24, 10).rotate([0, 1, 0], 90).translate(93.6, 0, 95).translate(0, 0, -0.5).scale(scale).color(accent));

return p.model();
