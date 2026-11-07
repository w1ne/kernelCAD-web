// SPDX-License-Identifier: CC0-1.0
// Cleanroom doorway assembly with a flush door leaf, side frame and overhead header.
meta({
  name: 'cleanroom-single-door-module',
  license: 'CC0-1.0',
  title: 'Cleanroom single-door module',
  description: 'Cleanroom doorway assembly with a flush door leaf, side frame and overhead header. Editable material controls: enamel coating, tinted safety glass, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('cleanroom-single-door-module');
p.part('outer-frame-left', box(85, 120, 2400, true).translate(-546, 0, 1200).scale(scale).color(steel));
p.part('outer-frame-right', box(85, 120, 2400, true).translate(546, 0, 1200).scale(scale).color(steel));
p.part('header', box(1300, 120, 160, true).translate(0, 0, 2400).scale(scale).color(enamel));
p.part('door-leaf', box(806, 78, 2112, true).translate(0, -14.4, 2208).scale(scale).color(enamel));
p.part('door-vision-panel', box(390, 18, 528, true).translate(0, -57.6, 1896).scale(scale).color(glass));
p.part('door-push-plate', box(40, 12, 170, true).translate(273, -62.4, 1165).scale(scale).color(enamel));

return p.model();
