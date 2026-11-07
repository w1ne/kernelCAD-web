// SPDX-License-Identifier: CC0-1.0
// Flush ceiling luminaire cassette with a framed diffuser and shallow service rim.
meta({
  name: 'cleanroom-ceiling-light-panel',
  license: 'CC0-1.0',
  title: 'Cleanroom ceiling light panel',
  description: 'Flush ceiling luminaire cassette with a framed diffuser and shallow service rim. Editable material controls: enamel coating, polymer controls; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const polymer = param('polymer', '#e5a331', { label: 'Polymer controls' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000' },
});
const p = assembly('cleanroom-ceiling-light-panel');
p.part('cassette', box(1200, 600, 90, true).translate(0, 0, 45).scale(scale).color(enamel));
p.part('diffuser', box(1080, 540, 24, true).translate(0, 0, 102).scale(scale).color(polymer));
p.part('long-rim--1', box(1272, 28, 126, true).translate(0, -288, 63).scale(scale).color(enamel));
p.part('long-rim-1', box(1272, 28, 126, true).translate(0, 288, 63).scale(scale).color(enamel));

return p.model();
