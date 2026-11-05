// SPDX-License-Identifier: CC0-1.0
// Deep wash-up sink with raised drainboard, splash panel and open pipe chase below.
meta({
  name: 'laboratory-washup-station',
  license: 'CC0-1.0',
  title: 'Laboratory wash-up station',
  description: 'Deep wash-up sink with raised drainboard, splash panel and open pipe chase below. Editable material controls: polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { polymer: '#23a5a2', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { polymer: '#ffe000', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('laboratory-washup-station');
p.part('worktop', box(1250, 720, 32, true).translate(0, 0, 884).scale(scale).color(stainless));
p.part('cabinet-kick-plinth', box(1125, 590.4, 80, true).translate(0, 0, 40).scale(scale).color(steel));
p.part('base-carcass-0', box(946, 561.6, 750, true).translate(0, 0, 455).scale(scale).color(stainless));
p.part('base-door-0', box(870.32, 18, 715, true).translate(0, -288, 447.5).scale(scale).color(stainless));
p.part('door-pull-0', box(12, 18, 110, true).translate(302.72, -309.6, 523).scale(scale).color(polymer));
p.part('sink-basin', box(425, 324, 80, true).translate(275, 0, 823).scale(scale).color(stainless));
p.part('sink-well', box(312.5, 230.4, 48, true).translate(275, -14.4, 822).scale(scale).color(stainless));
p.part('faucet-riser', cylinder(185, 13, 8).translate(275, 201.6, 920).scale(scale).color(stainless));
p.part('drainboard', box(400, 633.6, 20, true).translate(-362.5, 0, 907).scale(scale).color(stainless));
p.part('drain-groove-0', box(325, 8, 8, true).translate(-362.5, -216, 912).scale(scale).color(stainless));
p.part('drain-groove-1', box(325, 8, 8, true).translate(-362.5, -108, 912).scale(scale).color(stainless));
p.part('drain-groove-2', box(325, 8, 8, true).translate(-362.5, 0, 912).scale(scale).color(stainless));
p.part('drain-groove-3', box(325, 8, 8, true).translate(-362.5, 108, 912).scale(scale).color(stainless));
p.part('drain-groove-4', box(325, 8, 8, true).translate(-362.5, 216, 912).scale(scale).color(stainless));

p.part('faucet-spout', cylinder(135, 11, 8).rotateX(90).translate(275, 190, 1100).scale(scale).color(stainless));
p.part('faucet-elbow', sphere(15).translate(275, 190, 1100).scale(scale).color(stainless));
return p.model();
