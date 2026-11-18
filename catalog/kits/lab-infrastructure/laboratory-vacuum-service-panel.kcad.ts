// SPDX-License-Identifier: CC0-1.0
// Bench service panel with several vacuum outlets, labeled controls and a lower manifold rail.
meta({
  name: 'laboratory-vacuum-service-panel',
  license: 'CC0-1.0',
  title: 'Laboratory vacuum service panel',
  description: 'Bench service panel with several vacuum outlets, labeled controls and a lower manifold rail. Editable material controls: enamel coating, polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', stainless: '#d0d9d8' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', stainless: '#6f8488' },
});
const p = assembly('laboratory-vacuum-service-panel');
p.part('service-panel', box(900, 150, 520, true).translate(0, 0, 260).scale(scale).color(enamel));
p.part('header', box(945, 20, 90, true).translate(0, -82.5, 520).scale(scale).color(enamel));
p.part('lower-manifold', box(774, 30, 44, true).translate(0, -87, 115.6).scale(scale).color(stainless));
p.part('port-block-0', box(74, 24, 70, true).translate(-333, -93, 217).scale(scale).color(stainless));
p.part('control-knob-0', cylinder(36, 14, 8).translate(-333, -115.5, 164).scale(scale).color(polymer));
p.part('port-block-1', box(74, 24, 70, true).translate(-166.5, -93, 352.2).scale(scale).color(stainless));
p.part('control-knob-1', cylinder(36, 14, 8).translate(-166.5, -115.5, 299.2).scale(scale).color(polymer));
p.part('port-block-2', box(74, 24, 70, true).translate(0, -93, 217).scale(scale).color(stainless));
p.part('control-knob-2', cylinder(36, 14, 8).translate(0, -115.5, 164).scale(scale).color(polymer));
p.part('port-block-3', box(74, 24, 70, true).translate(166.5, -93, 352.2).scale(scale).color(stainless));
p.part('control-knob-3', cylinder(36, 14, 8).translate(166.5, -115.5, 299.2).scale(scale).color(polymer));
p.part('port-block-4', box(74, 24, 70, true).translate(333, -93, 217).scale(scale).color(stainless));
p.part('control-knob-4', cylinder(36, 14, 8).translate(333, -115.5, 164).scale(scale).color(polymer));

return p.model();
