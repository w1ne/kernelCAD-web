// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly laboratory wash-up station scene prop, modeled from scratch.
meta({
  name: 'laboratory-washup-station',
  license: 'CC0-1.0',
  title: 'Laboratory wash-up station',
  description: 'Deep wash-up sink with raised drainboard, splash panel and open pipe chase below. Knobs: overall scale, body color and accent color.',
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
const p = assembly('laboratory-washup-station');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('worktop', box(1250, 720, 32, true).translate(0, 0, 884), accent);
add('cabinet-kick-plinth', box(1125, 590.4, 80, true).translate(0, 0, 40), accent);
add('base-carcass-0', box(946, 561.6, 750, true).translate(0, 0, 455), body);
add('base-door-0', box(870.32, 18, 715, true).translate(0, -288, 447.5), accent);
add('door-pull-0', box(12, 18, 110, true).translate(302.72, -309.6, 523), body);
add('sink-basin', box(425, 324, 80, true).translate(275, 0, 823), body);
add('sink-well', box(312.5, 230.4, 48, true).translate(275, -14.4, 822), accent);
add('faucet-riser', cylinder(185, 13, 8).translate(275, 201.6, 920), accent);
add('faucet-spout', box(135, 22, 20, true).translate(275, 100.8, 1100), accent);
add('drainboard', box(400, 633.6, 20, true).translate(-362.5, 0, 907), body);
add('drain-groove-0', box(325, 8, 8, true).translate(-362.5, -216, 912), accent);
add('drain-groove-1', box(325, 8, 8, true).translate(-362.5, -108, 912), accent);
add('drain-groove-2', box(325, 8, 8, true).translate(-362.5, 0, 912), accent);
add('drain-groove-3', box(325, 8, 8, true).translate(-362.5, 108, 912), accent);
add('drain-groove-4', box(325, 8, 8, true).translate(-362.5, 216, 912), accent);

return p.model();
