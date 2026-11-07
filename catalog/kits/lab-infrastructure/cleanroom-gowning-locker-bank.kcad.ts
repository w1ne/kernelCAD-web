// SPDX-License-Identifier: CC0-1.0
// Four-bay gowning locker lineup with ventilated doors, label strips and a shared plinth.
meta({
  name: 'cleanroom-gowning-locker-bank',
  license: 'CC0-1.0',
  title: 'Cleanroom gowning locker bank',
  description: 'Four-bay gowning locker lineup with ventilated doors, label strips and a shared plinth. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', polymer: '#23a5a2', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', polymer: '#ffe000', steel: '#33464d' },
});
const p = assembly('cleanroom-gowning-locker-bank');
p.part('cabinet-shell', box(1200, 520, 1850, true).translate(0, 0, 925).scale(scale).color(enamel));
p.part('cabinet-plinth', box(1104, 468, 22, true).translate(0, 0, 11).scale(scale).color(steel));
p.part('door-0', box(247.68, 18, 1820, true).translate(-396, -265.2, 1835).scale(scale).color(enamel));
p.part('door-pull-0', box(14, 14, 296, true).translate(-313.44, -286, 1110).scale(scale).color(polymer));
p.part('door-1', box(247.68, 18, 1820, true).translate(-132, -265.2, 1835).scale(scale).color(enamel));
p.part('door-pull-1', box(14, 14, 296, true).translate(-49.44, -286, 1110).scale(scale).color(polymer));
p.part('door-2', box(247.68, 18, 1820, true).translate(132, -265.2, 1835).scale(scale).color(enamel));
p.part('door-pull-2', box(14, 14, 296, true).translate(214.56, -286, 1110).scale(scale).color(polymer));
p.part('door-3', box(247.68, 18, 1820, true).translate(396, -265.2, 1835).scale(scale).color(enamel));
p.part('door-pull-3', box(14, 14, 296, true).translate(478.56, -286, 1110).scale(scale).color(polymer));
p.part('vent-slot-0', box(384, 10, 9, true).translate(0, -270.4, 1447.5).scale(scale).color(polymer));
p.part('vent-slot-1', box(384, 10, 9, true).translate(0, -270.4, 1473.5).scale(scale).color(polymer));
p.part('vent-slot-2', box(384, 10, 9, true).translate(0, -270.4, 1499.5).scale(scale).color(polymer));
p.part('vent-slot-3', box(384, 10, 9, true).translate(0, -270.4, 1525.5).scale(scale).color(polymer));
p.part('vent-slot-4', box(384, 10, 9, true).translate(0, -270.4, 1551.5).scale(scale).color(polymer));

return p.model();
