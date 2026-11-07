// SPDX-License-Identifier: CC0-1.0
// Vertical laboratory exhaust riser with inspection band, support feet and a terminal cap.
meta({
  name: 'fume-exhaust-riser',
  license: 'CC0-1.0',
  title: 'Fume exhaust riser',
  description: 'Vertical laboratory exhaust riser with inspection band, support feet and a terminal cap. Editable material controls: enamel coating, stainless steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', stainless: '#d0d9d8' },
  highVisibility: { enamel: '#f0f2e8', stainless: '#6f8488' },
});
const p = assembly('fume-exhaust-riser');
p.part('duct-foot', box(546, 546, 45, true).translate(0, 0, 22.5).scale(scale).color(enamel));
p.part('riser-shaft', box(420, 420, 1980, true).translate(0, 0, 1035).scale(scale).color(stainless));
p.part('inspection-band-0', box(470.4, 470.4, 24, true).translate(0, 0, 172).scale(scale).color(enamel));
p.part('inspection-band-1', box(470.4, 470.4, 24, true).translate(0, 0, 1072).scale(scale).color(enamel));
p.part('inspection-band-2', box(470.4, 470.4, 24, true).translate(0, 0, 1972).scale(scale).color(enamel));
p.part('terminal-cap', box(537.6, 537.6, 90, true).translate(0, 0, 2070).scale(scale).color(enamel));

return p.model();
