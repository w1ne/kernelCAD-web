// SPDX-License-Identifier: CC0-1.0
// Compact countertop enclosure with a clear-front frame, top filter housing and lower controls.
meta({
  name: 'ductless-fume-enclosure',
  license: 'CC0-1.0',
  title: 'Ductless fume enclosure',
  description: 'Compact countertop enclosure with a clear-front frame, top filter housing and lower controls. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('ductless-fume-enclosure');
p.part('base-cabinet', box(900, 650, 315, true).translate(0, 0, 157.5).scale(scale).color(enamel));
p.part('work-surface', box(936, 682.5, 34, true).translate(0, 0, 332).scale(scale).color(stainless));
p.part('side-cheek--1', box(54, 650, 585, true).translate(-423, 0, 641.5).scale(scale).color(enamel));
p.part('side-cheek-1', box(54, 650, 585, true).translate(423, 0, 641.5).scale(scale).color(enamel));
p.part('rear-chamber-wall', box(792, 52, 585, true).translate(0, 299, 641.5).scale(scale).color(enamel));
p.part('sash-header', box(900, 30, 100, true).translate(0, -318.5, 930).scale(scale).color(enamel));
p.part('sash-rail', box(792, 28, 34, true).translate(0, -325, 595.25).scale(scale).color(enamel));
p.part('upper-housing', box(792, 507, 170, true).translate(0, 0, 965).scale(scale).color(enamel));
p.part('exhaust-neck', box(198, 143, 150, true).translate(0, 78, 1125).scale(scale).color(stainless));
p.part('control-button-0', box(30, 12, 24, true).translate(-288, -351, 153.75).scale(scale).color(polymer));
p.part('control-button-1', box(30, 12, 24, true).translate(-198, -351, 153.75).scale(scale).color(polymer));
p.part('control-button-2', box(30, 12, 24, true).translate(-108, -351, 153.75).scale(scale).color(polymer));
p.part('lower-control-panel', box(684, 18, 40, true).translate(0, -351, 246.8).scale(scale).color(enamel));

p.part('sash-glazing', box(640, 14, 270, true).translate(0, -303, 800).scale(scale).color(glass));
return p.model();
