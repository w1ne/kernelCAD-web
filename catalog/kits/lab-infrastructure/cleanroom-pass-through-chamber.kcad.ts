// SPDX-License-Identifier: CC0-1.0
// Wall pass-through cabinet with opposed doors, perimeter frame and flush handle bars.
meta({
  name: 'cleanroom-pass-through-chamber',
  license: 'CC0-1.0',
  title: 'Cleanroom pass-through chamber',
  description: 'Wall pass-through cabinet with opposed doors, perimeter frame and flush handle bars. Editable material controls: enamel coating, tinted safety glass, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', glass: '#8bd4dc', polymer: '#23a5a2', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', glass: '#44d3e2', polymer: '#ffe000', steel: '#33464d' },
});
const p = assembly('cleanroom-pass-through-chamber');
p.part('support-plinth', box(690, 582.8, 70, true).translate(0, 0, 35).scale(scale).color(steel));
p.part('chamber', box(750, 620, 580, true).translate(0, 0, 360).scale(scale).color(enamel));
p.part('inner-transfer-box', box(540, 446.4, 500, true).translate(0, 0, 360).scale(scale).color(enamel));
p.part('access-door--1', box(24, 508.4, 576, true).translate(-387, 0, 648).scale(scale).color(enamel));
p.part('door-handle--1', box(14, 28, 216, true).translate(-407.5, -155, 468).scale(scale).color(polymer));
p.part('access-door-1', box(24, 508.4, 576, true).translate(387, 0, 648).scale(scale).color(enamel));
p.part('door-handle-1', box(14, 28, 216, true).translate(407.5, -155, 468).scale(scale).color(polymer));
p.part('mount-frame-70', box(825, 682, 28, true).translate(0, 0, 84).scale(scale).color(steel));
p.part('mount-frame-650', box(825, 682, 28, true).translate(0, 0, 664).scale(scale).color(steel));

p.part('access-window-left', box(12, 288, 320, true).translate(-400, 0, 648).scale(scale).color(glass));
p.part('access-window-right', box(12, 288, 320, true).translate(400, 0, 648).scale(scale).color(glass));
return p.model();
