// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly rooftop air handler scene prop, modeled from scratch.
meta({
  name: 'rooftop-air-handler',
  license: 'CC0-1.0',
  title: 'Rooftop air handler',
  description: 'Packaged rooftop air handler with intake and filter sections, exhaust fans and raised service feet. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#70818a', { label: 'Body color' });
const accent = param('accent', '#dfa843', { label: 'Accent color' });
const p = assembly('rooftop-air-handler');
p.part('base-frame', box(840, 480, 35, true).translate(0, 0, 18).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('main-casing', box(772.8, 432, 309.6, true).translate(0, 0, 172).translate(0, 0, -0.5).scale(scale).color(body));
p.part('service-section-0', box(193.2, 446.4, 249.4, true).translate(-252, 0, 176.3).translate(0, 0, -0.5).scale(scale).color(body));
p.part('inspection-door-0', box(109.2, 14, 129, true).translate(-252, -225.6, 172).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('service-section-1', box(193.2, 446.4, 249.4, true).translate(0, 0, 176.3).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('inspection-door-1', box(109.2, 14, 129, true).translate(0, -225.6, 172).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('service-section-2', box(193.2, 446.4, 249.4, true).translate(252, 0, 176.3).translate(0, 0, -0.5).scale(scale).color(body));
p.part('inspection-door-2', box(109.2, 14, 129, true).translate(252, -225.6, 172).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('exhaust-fan-0', cylinder(26, 57.6, 12).rotate([1, 0, 0], 90).translate(-260.4, 137.8, 352.6).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('exhaust-fan-1', cylinder(26, 57.6, 12).rotate([1, 0, 0], 90).translate(0, 137.8, 352.6).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('exhaust-fan-2', cylinder(26, 57.6, 12).rotate([1, 0, 0], 90).translate(260.4, 137.8, 352.6).translate(0, 0, -0.5).scale(scale).color(accent));
p.part('support-foot-0', box(55, 45, 85, true).translate(-327.6, -172.8, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('support-foot-1', box(55, 45, 85, true).translate(327.6, -172.8, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('support-foot-2', box(55, 45, 85, true).translate(-327.6, 172.8, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('support-foot-3', box(55, 45, 85, true).translate(327.6, 172.8, 44).translate(0, 0, -0.5).scale(scale).color(body));
p.part('pipe-header', cylinder(268.8, 24, 10).rotate([0, 1, 0], 90).translate(100.8, 0, 81.7).translate(0, 0, -0.5).scale(scale).color(accent));

return p.model();
