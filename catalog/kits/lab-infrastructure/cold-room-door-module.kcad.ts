// SPDX-License-Identifier: CC0-1.0
// Insulated walk-in cold-room door with thick frame, exterior pull and protective kick plate.
meta({
  name: 'cold-room-door-module',
  license: 'CC0-1.0',
  title: 'Cold-room door module',
  description: 'Insulated walk-in cold-room door with thick frame, exterior pull and protective kick plate. Editable material controls: enamel coating, tinted safety glass, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('cold-room-door-module');
p.part('outer-frame-left', box(85, 150, 2200, true).translate(-504, 0, 1100).scale(scale).color(steel));
p.part('outer-frame-right', box(85, 150, 2200, true).translate(504, 0, 1100).scale(scale).color(steel));
p.part('header', box(1200, 150, 160, true).translate(0, 0, 2200).scale(scale).color(enamel));
p.part('door-leaf', box(744, 97.5, 1936, true).translate(0, -18, 2024).scale(scale).color(enamel));
p.part('door-vision-panel', box(360, 18, 484, true).translate(0, -72, 1738).scale(scale).color(glass));
p.part('door-push-plate', box(40, 12, 170, true).translate(252, -78, 1075).scale(scale).color(enamel));

return p.model();
