// SPDX-License-Identifier: CC0-1.0
// Low entry tray with a raised perimeter, layered removable mat sheets and corner tabs.
meta({
  name: 'cleanroom-tacky-mat-tray',
  license: 'CC0-1.0',
  title: 'Cleanroom tacky-mat tray',
  description: 'Low entry tray with a raised perimeter, layered removable mat sheets and corner tabs. Editable material controls: enamel coating, polymer controls; presets: cleanroom and high visibility.',
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
const p = assembly('cleanroom-tacky-mat-tray');
p.part('tray-base', box(900, 650, 55, true).translate(0, 0, 27.5).scale(scale).color(enamel));
p.part('replaceable-sheet-0', box(864, 624, 5, true).translate(0, 0, 57.5).scale(scale).color(polymer));
p.part('replaceable-sheet-1', box(853.2, 616.2, 5, true).translate(0, 0, 63.5).scale(scale).color(polymer));
p.part('replaceable-sheet-2', box(842.4, 608.4, 5, true).translate(0, 0, 69.5).scale(scale).color(polymer));
p.part('replaceable-sheet-3', box(831.6, 600.6, 5, true).translate(0, 0, 75.5).scale(scale).color(polymer));
p.part('corner-tab--396-0--273-0', box(42, 36, 18, true).translate(-396, -273, 88).scale(scale).color(polymer));
p.part('corner-tab--396-0-273-0', box(42, 36, 18, true).translate(-396, 273, 88).scale(scale).color(polymer));
p.part('corner-tab-396-0--273-0', box(42, 36, 18, true).translate(396, -273, 88).scale(scale).color(polymer));
p.part('corner-tab-396-0-273-0', box(42, 36, 18, true).translate(396, 273, 88).scale(scale).color(polymer));

return p.model();
