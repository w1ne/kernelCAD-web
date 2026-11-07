// SPDX-License-Identifier: CC0-1.0
// Large walk-in extraction enclosure with full-height side cheeks, floor pan and overhead duct.
meta({
  name: 'walk-in-fume-hood',
  license: 'CC0-1.0',
  title: 'Walk-in laboratory fume hood',
  description: 'Large walk-in extraction enclosure with full-height side cheeks, floor pan and overhead duct. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('walk-in-fume-hood');
p.part('base-cabinet', box(1500, 1100, 874, true).translate(0, 0, 437).scale(scale).color(enamel));
p.part('work-surface', box(1560, 1155, 34, true).translate(0, 0, 891).scale(scale).color(stainless));
p.part('side-cheek--1', box(90, 1100, 1276, true).translate(-705, 0, 1546).scale(scale).color(enamel));
p.part('side-cheek-1', box(90, 1100, 1276, true).translate(705, 0, 1546).scale(scale).color(enamel));
p.part('rear-chamber-wall', box(1320, 88, 1276, true).translate(0, 506, 1546).scale(scale).color(enamel));
p.part('sash-header', box(1500, 30, 100, true).translate(0, -539, 2180).scale(scale).color(enamel));
p.part('sash-rail', box(1320, 28, 34, true).translate(0, -550, 1465.2).scale(scale).color(enamel));
p.part('upper-housing', box(1320, 858, 170, true).translate(0, 0, 2215).scale(scale).color(enamel));
p.part('exhaust-neck', box(330, 242, 150, true).translate(0, 132, 2375).scale(scale).color(stainless));
p.part('control-button-0', box(30, 12, 24, true).translate(-480, -594, 405.3).scale(scale).color(polymer));
p.part('control-button-1', box(30, 12, 24, true).translate(-330, -594, 405.3).scale(scale).color(polymer));
p.part('control-button-2', box(30, 12, 24, true).translate(-180, -594, 405.3).scale(scale).color(polymer));
p.part('floor-pan', box(1350, 968, 36, true).translate(0, 0, 36).scale(scale).color(stainless));
p.part('wide-sash', box(1230, 25, 574.2, true).translate(0, -572, 1441.82).scale(scale).color(glass));

return p.model();
