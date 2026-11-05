// SPDX-License-Identifier: CC0-1.0
// Wall-mounted wash station with paired bowls, twin spray heads and a marked backplate.
meta({
  name: 'laboratory-wall-eyewash-station',
  license: 'CC0-1.0',
  title: 'Laboratory wall eyewash station',
  description: 'Wall-mounted wash station with paired bowls, twin spray heads and a marked backplate. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('laboratory-wall-eyewash-station');
p.part('wall-backplate', box(520, 45, 420, true).translate(0, 0, 210).scale(scale).color(enamel));
p.part('basin-rim', box(488.8, 114.4, 36, true).translate(0, -123.2, 85.2).scale(scale).color(stainless));
p.part('basin', box(395.2, 74.8, 30, true).translate(0, -105.6, 69.6).scale(scale).color(enamel));
p.part('spray-post--1', cylinder(243.6, 12, 8).translate(-145.6, -77, 75.6).scale(scale).color(steel));
p.part('spray-head--1', cylinder(34, 24, 8).translate(-145.6, -77, 315).scale(scale).color(polymer));
p.part('spray-post-1', cylinder(243.6, 12, 8).translate(145.6, -77, 75.6).scale(scale).color(steel));
p.part('spray-head-1', cylinder(34, 24, 8).translate(145.6, -77, 315).scale(scale).color(polymer));
p.part('activation-handle', box(239.2, 22, 22, true).translate(0, -149.6, 221).scale(scale).color(polymer));

return p.model();
