// SPDX-License-Identifier: CC0-1.0
// Laboratory isolation table with a thick top plate, pneumatic-looking supports and cross-braced base.
meta({
  name: 'vibration-isolation-table',
  license: 'CC0-1.0',
  title: 'Vibration isolation table',
  description: 'Laboratory isolation table with a thick top plate, pneumatic-looking supports and cross-braced base. Editable material controls: rubber and seals, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const rubber = param('rubber', '#30363a', { label: 'Rubber and seals' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { rubber: '#484f52', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { rubber: '#202528', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('vibration-isolation-table');
p.part('worktop', box(1000, 800, 36, true).translate(0, 0, 802).scale(scale).color(stainless));
p.part('leg-0--320-0', box(42, 42, 784, true).translate(-430, -320, 392).scale(scale).color(steel));
p.part('leg-0-320-0', box(42, 42, 784, true).translate(-430, 320, 392).scale(scale).color(steel));
p.part('leg-1--320-0', box(42, 42, 784, true).translate(-143.333, -320, 392).scale(scale).color(steel));
p.part('leg-1-320-0', box(42, 42, 784, true).translate(-143.333, 320, 392).scale(scale).color(steel));
p.part('leg-2--320-0', box(42, 42, 784, true).translate(143.333, -320, 392).scale(scale).color(steel));
p.part('leg-2-320-0', box(42, 42, 784, true).translate(143.333, 320, 392).scale(scale).color(steel));
p.part('leg-3--320-0', box(42, 42, 784, true).translate(430, -320, 392).scale(scale).color(steel));
p.part('leg-3-320-0', box(42, 42, 784, true).translate(430, 320, 392).scale(scale).color(steel));
p.part('lower-cross-rail', box(860, 36, 28, true).translate(0, 0, 210.8).scale(scale).color(steel));
p.part('cross-brace--1', box(700, 20, 22, true).translate(0, -280, 421).scale(scale).color(steel));
p.part('cross-brace-1', box(700, 20, 22, true).translate(0, 280, 421).scale(scale).color(steel));

p.part('foot-pad-0', cylinder(40, 24, 8).translate(-430, -320, 0).scale(scale).color(rubber));
p.part('foot-pad-1', cylinder(40, 24, 8).translate(-430, 320, 0).scale(scale).color(rubber));
p.part('foot-pad-2', cylinder(40, 24, 8).translate(-143.333, -320, 0).scale(scale).color(rubber));
p.part('foot-pad-3', cylinder(40, 24, 8).translate(-143.333, 320, 0).scale(scale).color(rubber));
p.part('foot-pad-4', cylinder(40, 24, 8).translate(143.333, -320, 0).scale(scale).color(rubber));
p.part('foot-pad-5', cylinder(40, 24, 8).translate(143.333, 320, 0).scale(scale).color(rubber));
p.part('foot-pad-6', cylinder(40, 24, 8).translate(430, -320, 0).scale(scale).color(rubber));
p.part('foot-pad-7', cylinder(40, 24, 8).translate(430, 320, 0).scale(scale).color(rubber));
return p.model();
