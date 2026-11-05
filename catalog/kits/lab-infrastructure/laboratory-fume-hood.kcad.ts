// SPDX-License-Identifier: CC0-1.0
// Full-size bench fume enclosure with a work chamber, framed sash, base storage and exhaust crown.
meta({
  name: 'laboratory-fume-hood',
  license: 'CC0-1.0',
  title: 'Laboratory fume hood',
  description: 'Full-size bench fume enclosure with a work chamber, framed sash, base storage and exhaust crown. Editable material controls: enamel coating, tinted safety glass, polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-fume-hood');
p.part('base-cabinet', box(1200, 800, 836, true).translate(0, 0, 418).scale(scale).color(enamel));
p.part('work-surface', box(1248, 840, 34, true).translate(0, 0, 853).scale(scale).color(stainless));
p.part('side-cheek--1', box(72, 800, 1214, true).translate(-564, 0, 1477).scale(scale).color(enamel));
p.part('side-cheek-1', box(72, 800, 1214, true).translate(564, 0, 1477).scale(scale).color(enamel));
p.part('rear-chamber-wall', box(1056, 64, 1214, true).translate(0, 368, 1477).scale(scale).color(enamel));
p.part('sash-header', box(1200, 30, 100, true).translate(0, -392, 2080).scale(scale).color(enamel));
p.part('sash-rail', box(1056, 28, 34, true).translate(0, -400, 1399.3).scale(scale).color(enamel));
p.part('upper-housing', box(1056, 624, 170, true).translate(0, 0, 2115).scale(scale).color(enamel));
p.part('exhaust-neck', box(264, 176, 150, true).translate(0, 96, 2275).scale(scale).color(stainless));
p.part('control-button-0', box(30, 12, 24, true).translate(-384, -432, 388.2).scale(scale).color(polymer));
p.part('control-button-1', box(30, 12, 24, true).translate(-264, -432, 388.2).scale(scale).color(polymer));
p.part('control-button-2', box(30, 12, 24, true).translate(-144, -432, 388.2).scale(scale).color(polymer));

p.part('sash-glazing', box(920, 14, 500, true).translate(0, -375, 1680).scale(scale).color(glass));
return p.model();
