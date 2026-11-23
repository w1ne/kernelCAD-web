// SPDX-License-Identifier: CC0-1.0
// Cleanroom doorway: a flush enamel door leaf with a vision panel hangs between two
// steel frame posts under an enamel header. A stainless push plate lies on the leaf
// face at hand height on the latch side.
meta({
  name: 'cleanroom-single-door-module',
  license: 'CC0-1.0',
  title: 'Cleanroom single-door module',
  description: 'Cleanroom doorway assembly with a flush door leaf, vision panel, stainless push plate, side frame and overhead header. Editable material controls: enamel coating, tinted safety glass, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', glass: '#8bd4dc', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', glass: '#44d3e2', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('cleanroom-single-door-module');
p.part('outer-frame-left', box(85, 120, 2400, true).translate(-546, 0, 1200).scale(scale).color(steel));
p.part('outer-frame-right', box(85, 120, 2400, true).translate(546, 0, 1200).scale(scale).color(steel));
p.part('header', box(1300, 120, 160, true).translate(0, 0, 2400).scale(scale).color(enamel));
p.part('door-leaf', box(806, 78, 2112, true).translate(0, -14.4, 1152).scale(scale).color(enamel));
p.part('door-vision-panel', box(390, 18, 528, true).translate(0, -57.6, 1896).scale(scale).color(glass));
// The leaf front face is at y = -53.4; the 4 mm plate lies on it.
p.part('door-push-plate', box(100, 4, 300, true).translate(273, -55.4, 1165).scale(scale).color(stainless));

return p.model();
