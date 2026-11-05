// SPDX-License-Identifier: CC0-1.0
// Tall sealed wall panel with a framed observation window and reinforced edge channels.
meta({
  name: 'cleanroom-viewing-window',
  license: 'CC0-1.0',
  title: 'Cleanroom viewing window panel',
  description: 'Tall sealed wall panel with a framed observation window and reinforced edge channels. Editable material controls: enamel coating, tinted safety glass, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const glass = param('glass', '#55b7ca', { label: 'Tinted safety glass' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', glass: '#8bd4dc', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', glass: '#44d3e2', steel: '#33464d' },
});
const p = assembly('cleanroom-viewing-window');
p.part('wall-core', box(1200, 100, 2400, true).translate(0, 0, 1200).scale(scale).color(enamel));
p.part('edge-channel--576-0', box(42, 120, 2400, true).translate(-576, 0, 1200).scale(scale).color(steel));
p.part('edge-channel-576-0', box(42, 120, 2400, true).translate(576, 0, 1200).scale(scale).color(steel));
p.part('floor-track', box(1236, 125, 52, true).translate(0, 0, 26).scale(scale).color(steel));
p.part('head-track', box(1236, 125, 70, true).translate(0, 0, 2400).scale(scale).color(steel));
p.part('window-frame', box(576, 24, 600, true).translate(0, -55, 1788).scale(scale).color(steel));
p.part('window-infill', box(480, 12, 432, true).translate(0, -57, 1704).scale(scale).color(glass));

return p.model();
