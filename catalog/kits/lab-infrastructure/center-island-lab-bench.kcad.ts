// SPDX-License-Identifier: CC0-1.0
// Double-sided island bench with a broad worktop, four base bays and central service spine.
meta({
  name: 'center-island-lab-bench',
  license: 'CC0-1.0',
  title: 'Center island laboratory bench',
  description: 'Double-sided island bench with a broad worktop, four base bays and central service spine. Editable material controls: enamel coating, polymer controls, stainless steel, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('center-island-lab-bench');
p.part('worktop', box(1800, 1200, 32, true).translate(0, 0, 904).scale(scale).color(stainless));
p.part('cabinet-kick-plinth', box(1620, 984, 80, true).translate(0, 0, 40).scale(scale).color(steel));
p.part('base-carcass-0', box(340.56, 936, 770, true).translate(-594, 0, 465).scale(scale).color(enamel));
p.part('base-door-0', box(313.315, 18, 735, true).translate(-594, -480, 457.5).scale(scale).color(enamel));
p.part('door-pull-0', box(12, 18, 110, true).translate(-485.021, -516, 533.4).scale(scale).color(polymer));
p.part('base-carcass-1', box(340.56, 936, 770, true).translate(-198, 0, 465).scale(scale).color(enamel));
p.part('base-door-1', box(313.315, 18, 735, true).translate(-198, -480, 457.5).scale(scale).color(enamel));
p.part('door-pull-1', box(12, 18, 110, true).translate(-89.021, -516, 533.4).scale(scale).color(polymer));
p.part('base-carcass-2', box(340.56, 936, 770, true).translate(198, 0, 465).scale(scale).color(enamel));
p.part('base-door-2', box(313.315, 18, 735, true).translate(198, -480, 457.5).scale(scale).color(enamel));
p.part('door-pull-2', box(12, 18, 110, true).translate(306.979, -516, 533.4).scale(scale).color(polymer));
p.part('base-carcass-3', box(340.56, 936, 770, true).translate(594, 0, 465).scale(scale).color(enamel));
p.part('base-door-3', box(313.315, 18, 735, true).translate(594, -480, 457.5).scale(scale).color(enamel));
p.part('door-pull-3', box(12, 18, 110, true).translate(702.979, -516, 533.4).scale(scale).color(polymer));
p.part('service-spine', box(216, 90, 360, true).translate(0, 0, 1100).scale(scale).color(enamel));
p.part('spine-outlet-0', box(52, 14, 34, true).translate(0, -52, 985).scale(scale).color(polymer));
p.part('spine-outlet-1', box(52, 14, 34, true).translate(0, -52, 1053).scale(scale).color(polymer));
p.part('spine-outlet-2', box(52, 14, 34, true).translate(0, -52, 1121).scale(scale).color(polymer));
p.part('spine-outlet-3', box(52, 14, 34, true).translate(0, -52, 1189).scale(scale).color(polymer));

return p.model();
