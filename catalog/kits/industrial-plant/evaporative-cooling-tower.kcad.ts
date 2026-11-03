// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly evaporative cooling tower scene prop, modeled from scratch.
meta({
  name: 'evaporative-cooling-tower',
  license: 'CC0-1.0',
  title: 'Evaporative cooling tower',
  description: 'Industrial cooling tower with a broad basin, tapered-looking shell and rooftop fan assembly. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#73838a', { label: 'Body color' });
const accent = param('accent', '#dda946', { label: 'Accent color' });
const p = assembly('evaporative-cooling-tower');
p.part('basin', box(680, 680, 105, true).translate(0, 0, 52).translate(0, 0, 0.5).scale(scale).color(accent));
p.part('tower-body-lower', box(557.6, 557.6, 393.6, true).translate(0, 0, 301.8).translate(0, 0, 0.5).scale(scale).color(body));
p.part('tower-body-upper', box(455.6, 455.6, 295.2, true).translate(0, 0, 646.2).translate(0, 0, 0.5).scale(scale).color(body));
p.part('throat-ring', box(482.8, 482.8, 30, true).translate(0, 0, 656.2).translate(0, 0, 0.5).scale(scale).color(accent));
p.part('drift-cap', box(516.8, 516.8, 28, true).translate(0, 0, 904).translate(0, 0, 0.5).scale(scale).color(body));
p.part('fan-ring-0', cylinder(30, 81.6, 12).translate(-95.2, 0, 930).translate(0, 0, 0.5).scale(scale).color(accent));
p.part('fan-hub-0', cylinder(48, 30.6, 8).translate(-95.2, 0, 950).translate(0, 0, 0.5).scale(scale).color(body));
p.part('fan-ring-1', cylinder(30, 81.6, 12).translate(95.2, 0, 930).translate(0, 0, 0.5).scale(scale).color(accent));
p.part('fan-hub-1', cylinder(48, 30.6, 8).translate(95.2, 0, 950).translate(0, 0, 0.5).scale(scale).color(body));
p.part('basin-leg-0', box(36, 36, 105, true).translate(-231.2, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(body));
p.part('basin-leg-1', box(36, 36, 105, true).translate(-81.6, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(body));
p.part('basin-leg-2', box(36, 36, 105, true).translate(68, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(body));
p.part('basin-leg-3', box(36, 36, 105, true).translate(217.6, -231.2, 52).translate(0, 0, 0.5).scale(scale).color(body));

return p.model();
