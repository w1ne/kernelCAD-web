// SPDX-License-Identifier: CC0-1.0
// Compact shielded enclosure with three clear-looking sides, a low sill and overhead filter box.
meta({
  name: 'chemical-weighing-enclosure',
  license: 'CC0-1.0',
  title: 'Chemical weighing enclosure',
  description: 'Compact shielded enclosure with three clear-looking sides, a low sill and overhead filter box. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('chemical-weighing-enclosure');
p.part('base-cabinet', box(680, 600, 255, true).translate(0, 0, 127.5).scale(scale).color(enamel));
p.part('work-surface', box(707.2, 630, 34, true).translate(0, 0, 272).scale(scale).color(stainless));
p.part('side-cheek--1', box(40.8, 600, 445, true).translate(-319.6, 0, 511.5).scale(scale).color(enamel));
p.part('side-cheek-1', box(40.8, 600, 445, true).translate(319.6, 0, 511.5).scale(scale).color(enamel));
p.part('rear-chamber-wall', box(598.4, 48, 445, true).translate(0, 276, 511.5).scale(scale).color(enamel));
p.part('sash-header', box(680, 30, 100, true).translate(0, -294, 730).scale(scale).color(enamel));
p.part('sash-rail', box(598.4, 28, 34, true).translate(0, -300, 472.25).scale(scale).color(enamel));
p.part('upper-housing', box(598.4, 468, 170, true).translate(0, 0, 765).scale(scale).color(enamel));
p.part('exhaust-neck', box(149.6, 132, 150, true).translate(0, 72, 925).scale(scale).color(stainless));
p.part('control-button-0', box(30, 12, 24, true).translate(-217.6, -324, 126.75).scale(scale).color(polymer));
p.part('control-button-1', box(30, 12, 24, true).translate(-149.6, -324, 126.75).scale(scale).color(polymer));
p.part('control-button-2', box(30, 12, 24, true).translate(-81.6, -324, 126.75).scale(scale).color(polymer));
p.part('lower-control-panel', box(516.8, 18, 40, true).translate(0, -324, 203.6).scale(scale).color(enamel));

p.part('sash-glazing', box(490, 14, 220, true).translate(0, -278, 615).scale(scale).color(glass));
return p.model();
