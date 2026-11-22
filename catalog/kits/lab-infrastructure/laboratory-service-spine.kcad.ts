// SPDX-License-Identifier: CC0-1.0
// Vertical bench service spine with separated power, data and utility panels.
meta({
  name: 'laboratory-service-spine',
  license: 'CC0-1.0',
  title: 'Laboratory service spine',
  description: 'Vertical bench service spine with separated power, data and utility panels. Editable material controls: enamel coating, polymer controls, stainless steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-service-spine');
p.part('service-panel', box(260, 160, 680, true).translate(0, 0, 340).scale(scale).color(enamel));
p.part('header', box(273, 20, 90, true).translate(0, -88, 680).scale(scale).color(enamel));
p.part('lower-manifold', box(223.6, 30, 44, true).translate(0, -92.8, 144.4).scale(scale).color(stainless));
p.part('port-block-0', box(74, 24, 70, true).translate(-96.2, -99.2, 273).scale(scale).color(stainless));
p.part('control-knob-0', cylinder(36, 14, 8).translate(-96.2, -123.2, 220).scale(scale).color(polymer));
p.part('port-block-1', box(74, 24, 70, true).translate(-57.72, -99.2, 449.8).scale(scale).color(stainless));
p.part('control-knob-1', cylinder(36, 14, 8).translate(-57.72, -123.2, 396.8).scale(scale).color(polymer));
p.part('port-block-2', box(74, 24, 70, true).translate(-19.24, -99.2, 273).scale(scale).color(stainless));
p.part('control-knob-2', cylinder(36, 14, 8).translate(-19.24, -123.2, 220).scale(scale).color(polymer));
p.part('port-block-3', box(74, 24, 70, true).translate(19.24, -99.2, 449.8).scale(scale).color(stainless));
p.part('control-knob-3', cylinder(36, 14, 8).translate(19.24, -123.2, 396.8).scale(scale).color(polymer));
p.part('port-block-4', box(74, 24, 70, true).translate(57.72, -99.2, 273).scale(scale).color(stainless));
p.part('control-knob-4', cylinder(36, 14, 8).translate(57.72, -123.2, 220).scale(scale).color(polymer));
p.part('port-block-5', box(74, 24, 70, true).translate(96.2, -99.2, 449.8).scale(scale).color(stainless));
p.part('control-knob-5', cylinder(36, 14, 8).translate(96.2, -123.2, 396.8).scale(scale).color(polymer));

return p.model();
