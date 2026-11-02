// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly wet-lab sink bench scene prop, modeled from scratch.
meta({
  name: 'wet-lab-sink-bench',
  license: 'CC0-1.0',
  title: 'Wet-lab sink bench',
  description: 'Wet bench with an inset wash basin, high-neck faucet, splashback and two storage bays. Knobs: overall scale, body color and accent color.',
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
const p = assembly('wet-lab-sink-bench');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1500, 700, 32, true).translate(0, 0, 884), accent);
add('cabinet-kick-plinth', box(1350, 574, 80, true).translate(0, 0, 40), accent);
add('base-carcass-0', box(567.6, 546, 750, true).translate(-330, 0, 455), body);
add('base-door-0', box(522.192, 18, 715, true).translate(-330, -280, 447.5), accent);
add('door-pull-0', box(12, 18, 110, true).translate(-148.368, -301, 523), body);
add('base-carcass-1', box(567.6, 546, 750, true).translate(330, 0, 455), body);
add('base-door-1', box(522.192, 18, 715, true).translate(330, -280, 447.5), accent);
add('door-pull-1', box(12, 18, 110, true).translate(511.632, -301, 523), body);
add('splashback', box(1500, 32, 250, true).translate(0, 322, 1150), body);
add('sink-basin', box(510, 315, 80, true).translate(330, 0, 823), body);
add('sink-well', box(375, 224, 48, true).translate(330, -14, 822), accent);
add('faucet-riser', cylinder(185, 13, 8).translate(330, 196, 920), accent);
add('faucet-spout', box(135, 22, 20, true).translate(330, 98, 1100), accent);

return p.model();
