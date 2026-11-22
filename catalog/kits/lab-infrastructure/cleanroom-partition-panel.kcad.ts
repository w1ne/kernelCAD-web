// SPDX-License-Identifier: CC0-1.0
// Modular cleanroom wall panel with vertical edge channels and a shallow bottom rail.
meta({
  name: 'cleanroom-partition-panel',
  license: 'CC0-1.0',
  title: 'Cleanroom partition panel',
  description: 'Modular cleanroom wall panel with vertical edge channels and a shallow bottom rail. Editable material controls: enamel coating, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', steel: '#33464d' },
});
const p = assembly('cleanroom-partition-panel');
p.part('wall-core', box(1200, 100, 2400, true).translate(0, 0, 1200).scale(scale).color(enamel));
p.part('edge-channel--576-0', box(42, 120, 2400, true).translate(-576, 0, 1200).scale(scale).color(steel));
p.part('edge-channel-576-0', box(42, 120, 2400, true).translate(576, 0, 1200).scale(scale).color(steel));
p.part('floor-track', box(1236, 125, 52, true).translate(0, 0, 26).scale(scale).color(steel));
p.part('head-track', box(1236, 125, 70, true).translate(0, 0, 2400).scale(scale).color(steel));

return p.model();
