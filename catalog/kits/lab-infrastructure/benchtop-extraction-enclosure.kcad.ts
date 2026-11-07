// SPDX-License-Identifier: CC0-1.0
// Small extraction chamber with a raised front lip, side panels and replaceable-looking top module.
meta({
  name: 'benchtop-extraction-enclosure',
  license: 'CC0-1.0',
  title: 'Benchtop extraction enclosure',
  description: 'Small extraction chamber with a raised front lip, side panels and replaceable-looking top module. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const glass = param('glass', '#55b7ca', { label: 'Tinted safety glass' });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', glass: '#8bd4dc', polymer: '#23a5a2', stainless: '#d0d9d8' },
  highVisibility: { enamel: '#f0f2e8', glass: '#44d3e2', polymer: '#ffe000', stainless: '#6f8488' },
});
const p = assembly('benchtop-extraction-enclosure');
p.part('base-cabinet', box(700, 560, 234, true).translate(0, 0, 117).scale(scale).color(enamel));
p.part('work-surface', box(728, 588, 34, true).translate(0, 0, 251).scale(scale).color(stainless));
p.part('side-cheek--1', box(42, 560, 396, true).translate(-329, 0, 466).scale(scale).color(enamel));
p.part('side-cheek-1', box(42, 560, 396, true).translate(329, 0, 466).scale(scale).color(enamel));
p.part('rear-chamber-wall', box(616, 44.8, 396, true).translate(0, 257.6, 466).scale(scale).color(enamel));
p.part('sash-header', box(700, 30, 100, true).translate(0, -274.4, 660).scale(scale).color(enamel));
p.part('sash-rail', box(616, 28, 34, true).translate(0, -280, 429.2).scale(scale).color(enamel));
p.part('upper-housing', box(616, 436.8, 170, true).translate(0, 0, 695).scale(scale).color(enamel));
p.part('exhaust-neck', box(154, 123.2, 150, true).translate(0, 67.2, 855).scale(scale).color(stainless));
p.part('control-button-0', box(30, 12, 24, true).translate(-224, -302.4, 117.3).scale(scale).color(polymer));
p.part('control-button-1', box(30, 12, 24, true).translate(-154, -302.4, 117.3).scale(scale).color(polymer));
p.part('control-button-2', box(30, 12, 24, true).translate(-84, -302.4, 117.3).scale(scale).color(polymer));
p.part('lower-control-panel', box(532, 18, 40, true).translate(0, -302.4, 188.48).scale(scale).color(enamel));

p.part('sash-glazing', box(510, 14, 210, true).translate(0, -258, 550).scale(scale).color(glass));
return p.model();
