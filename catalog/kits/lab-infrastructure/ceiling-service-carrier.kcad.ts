// SPDX-License-Identifier: CC0-1.0
// Ceiling-hung carrier rail with end hangers, utility tray and repeating service drops.
meta({
  name: 'ceiling-service-carrier',
  license: 'CC0-1.0',
  title: 'Ceiling service carrier',
  description: 'Ceiling-hung carrier rail with end hangers, utility tray and repeating service drops. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('ceiling-service-carrier');
p.part('support-post--1', box(50, 55, 1500, true).translate(-774, 0, 750).scale(scale).color(steel));
p.part('base-foot--1', box(170, 150, 24, true).translate(-774, 0, 12).scale(scale).color(enamel));
p.part('support-post-1', box(50, 55, 1500, true).translate(774, 0, 750).scale(scale).color(steel));
p.part('base-foot-1', box(170, 150, 24, true).translate(774, 0, 12).scale(scale).color(enamel));
p.part('carrier-rail', box(1800, 120, 80, true).translate(0, 0, 1460).scale(scale).color(steel));
p.part('service-line-0', box(1692, 24, 24, true).translate(0, -84, 1362).scale(scale).color(stainless));
p.part('service-line-1', box(1692, 24, 24, true).translate(0, 0, 1334).scale(scale).color(stainless));
p.part('service-line-2', box(1692, 24, 24, true).translate(0, 84, 1306).scale(scale).color(stainless));
p.part('service-drop-0', box(28, 28, 1320, true).translate(-648, 0, 750).scale(scale).color(stainless));
p.part('service-drop-1', box(28, 28, 1320, true).translate(-216, 0, 750).scale(scale).color(stainless));
p.part('service-drop-2', box(28, 28, 1320, true).translate(216, 0, 750).scale(scale).color(stainless));
p.part('service-drop-3', box(28, 28, 1320, true).translate(648, 0, 750).scale(scale).color(stainless));

return p.model();
