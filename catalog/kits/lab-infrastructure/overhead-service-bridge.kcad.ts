// SPDX-License-Identifier: CC0-1.0
// Raised service bridge with twin support posts, cable tray and parallel utility lines.
meta({
  name: 'overhead-service-bridge',
  license: 'CC0-1.0',
  title: 'Overhead laboratory service bridge',
  description: 'Raised service bridge with twin support posts, cable tray and parallel utility lines. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('overhead-service-bridge');
p.part('support-post--1', box(50, 55, 1250, true).translate(-645, 0, 625).scale(scale).color(steel));
p.part('base-foot--1', box(170, 150, 24, true).translate(-645, 0, 12).scale(scale).color(enamel));
p.part('support-post-1', box(50, 55, 1250, true).translate(645, 0, 625).scale(scale).color(steel));
p.part('base-foot-1', box(170, 150, 24, true).translate(645, 0, 12).scale(scale).color(enamel));
p.part('carrier-rail', box(1500, 152, 80, true).translate(0, 0, 1210).scale(scale).color(steel));
p.part('service-line-0', box(1410, 24, 24, true).translate(0, -106.4, 1112).scale(scale).color(stainless));
p.part('service-line-1', box(1410, 24, 24, true).translate(0, -35.467, 1084).scale(scale).color(stainless));
p.part('service-line-2', box(1410, 24, 24, true).translate(0, 35.467, 1056).scale(scale).color(stainless));
p.part('service-line-3', box(1410, 24, 24, true).translate(0, 106.4, 1028).scale(scale).color(stainless));

return p.model();
