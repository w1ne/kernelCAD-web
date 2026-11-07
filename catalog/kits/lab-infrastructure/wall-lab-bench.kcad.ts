// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly wall laboratory bench scene prop, modeled from scratch.
meta({
  name: 'wall-lab-bench',
  license: 'CC0-1.0',
  title: 'Wall laboratory bench',
  description: 'Wall-mounted laboratory workbench with a chemical-resistant top, base units and rear service upstand. Knobs: overall scale, body color and accent color.',
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
const p = assembly('wall-lab-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1500, 650, 32, true).translate(0, 0, 884), accent);
add('cabinet-kick-plinth', box(1350, 533, 80, true).translate(0, 0, 40), accent);
add('base-carcass-0', box(567.6, 507, 750, true).translate(-330, 0, 455), body);
add('base-door-0', box(522.192, 18, 715, true).translate(-330, -260, 447.5), accent);
add('door-pull-0', box(12, 18, 110, true).translate(-148.368, -279.5, 523), body);
add('base-carcass-1', box(567.6, 507, 750, true).translate(330, 0, 455), body);
add('base-door-1', box(522.192, 18, 715, true).translate(330, -260, 447.5), accent);
add('door-pull-1', box(12, 18, 110, true).translate(511.632, -279.5, 523), body);
add('splashback', box(1500, 32, 250, true).translate(0, 299, 1150), body);

return p.model();
