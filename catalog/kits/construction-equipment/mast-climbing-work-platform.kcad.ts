// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly mast-climbing work platform scene prop, modeled from scratch.
meta({
  name: "mast-climbing-work-platform",
  license: 'CC0-1.0',
  title: "Mast-climbing work platform",
  description: "Twin-mast access platform with guardrails, deck and ground outriggers. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('mast-climbing-work-platform');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('ground-frame', box(1353, 475.6, 90, true).translate(0, 0, 45), body);
add('mast--1', box(70, 72, 1665, true).translate(-610.5, 0, 922.5), body);
add('outrigger--1', box(858, 48, 55, true).translate(-660, 0, 27.5), accent);
add('mast-1', box(70, 72, 1665, true).translate(610.5, 0, 922.5), body);
add('outrigger-1', box(858, 48, 55, true).translate(660, 0, 27.5), accent);
add('working-platform', box(1848, 510.4, 70, true).translate(0, 0, 1052.5), accent);
add('guardrail--1', box(1815, 34, 462.5, true).translate(0, -243.6, 1341.25), body);
add('guardrail-1', box(1815, 34, 462.5, true).translate(0, 243.6, 1341.25), body);

return p.model();
