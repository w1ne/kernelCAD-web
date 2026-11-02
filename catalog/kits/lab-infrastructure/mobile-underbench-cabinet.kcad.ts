// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly mobile underbench cabinet scene prop, modeled from scratch.
meta({
  name: 'mobile-underbench-cabinet',
  license: 'CC0-1.0',
  title: 'Mobile underbench cabinet',
  description: 'Compact rolling laboratory storage unit with two drawers, side pull and visible casters. Knobs: overall scale, body color and accent color.',
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
const p = assembly('mobile-underbench-cabinet');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('cabinet-shell', box(500, 520, 665, true).translate(0, 0, 387.5), body);
add('cabinet-plinth', box(460, 468, 77, true).translate(0, 0, 38.5), accent);
add('drawer-front-0-0', box(202.1, 18, 320.5, true).translate(-110, -265.2, 376.5), accent);
add('drawer-pull-0-0', box(60.2, 12, 14, true).translate(-110, -286, 228.25), body);
add('drawer-front-0-1', box(202.1, 18, 320.5, true).translate(-110, -265.2, 709), body);
add('drawer-pull-0-1', box(60.2, 12, 14, true).translate(-110, -286, 560.75), body);
add('drawer-front-1-0', box(202.1, 18, 320.5, true).translate(110, -265.2, 376.5), accent);
add('drawer-pull-1-0', box(60.2, 12, 14, true).translate(110, -286, 228.25), body);
add('drawer-front-1-1', box(202.1, 18, 320.5, true).translate(110, -265.2, 709), body);
add('drawer-pull-1-1', box(60.2, 12, 14, true).translate(110, -286, 560.75), body);
add('caster--190-0--197-6', cylinder(55, 34, 8).translate(-190, -197.6, 0), accent);
add('caster--190-0-197-6', cylinder(55, 34, 8).translate(-190, 197.6, 0), accent);
add('caster-190-0--197-6', cylinder(55, 34, 8).translate(190, -197.6, 0), accent);
add('caster-190-0-197-6', cylinder(55, 34, 8).translate(190, 197.6, 0), accent);

return p.model();
