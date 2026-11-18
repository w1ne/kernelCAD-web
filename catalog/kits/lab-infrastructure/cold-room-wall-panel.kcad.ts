// SPDX-License-Identifier: CC0-1.0
// Insulated modular cold-room panel with edge cams, panel joints and a floor channel.
meta({
  name: 'cold-room-wall-panel',
  license: 'CC0-1.0',
  title: 'Cold-room wall panel',
  description: 'Insulated modular cold-room panel with edge cams, panel joints and a floor channel. Editable material controls: enamel coating, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('cold-room-wall-panel');
p.part('wall-core', box(1200, 120, 2300, true).translate(0, 0, 1150).scale(scale).color(enamel));
p.part('edge-channel--576-0', box(42, 144, 2300, true).translate(-576, 0, 1150).scale(scale).color(steel));
p.part('edge-channel-576-0', box(42, 144, 2300, true).translate(576, 0, 1150).scale(scale).color(steel));
p.part('floor-track', box(1236, 150, 52, true).translate(0, 0, 26).scale(scale).color(steel));
p.part('head-track', box(1236, 150, 70, true).translate(0, 0, 2300).scale(scale).color(steel));

return p.model();
