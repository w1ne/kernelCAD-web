// SPDX-License-Identifier: CC0-1.0
// Long bench power rail with separated outlet blocks, end caps and wall brackets.
meta({
  name: 'laboratory-electrical-service-rail',
  license: 'CC0-1.0',
  title: 'Laboratory electrical service rail',
  description: 'Long bench power rail with separated outlet blocks, end caps and wall brackets. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-electrical-service-rail');
p.part('mounting-rail', box(1400, 110, 180, true).translate(0, 0, 90).scale(scale).color(steel));
p.part('outlet-module-0', box(110, 35, 111.6, true).translate(-588, -71.5, 149.4).scale(scale).color(polymer));
p.part('socket-0', box(45, 10, 48, true).translate(-588, -93.5, 117.6).scale(scale).color(polymer));
p.part('outlet-module-1', box(110, 35, 111.6, true).translate(-352.8, -71.5, 149.4).scale(scale).color(polymer));
p.part('socket-1', box(45, 10, 48, true).translate(-352.8, -93.5, 117.6).scale(scale).color(polymer));
p.part('outlet-module-2', box(110, 35, 111.6, true).translate(-117.6, -71.5, 149.4).scale(scale).color(polymer));
p.part('socket-2', box(45, 10, 48, true).translate(-117.6, -93.5, 117.6).scale(scale).color(polymer));
p.part('outlet-module-3', box(110, 35, 111.6, true).translate(117.6, -71.5, 149.4).scale(scale).color(polymer));
p.part('socket-3', box(45, 10, 48, true).translate(117.6, -93.5, 117.6).scale(scale).color(polymer));
p.part('outlet-module-4', box(110, 35, 111.6, true).translate(352.8, -71.5, 149.4).scale(scale).color(polymer));
p.part('socket-4', box(45, 10, 48, true).translate(352.8, -93.5, 117.6).scale(scale).color(polymer));
p.part('outlet-module-5', box(110, 35, 111.6, true).translate(588, -71.5, 149.4).scale(scale).color(polymer));
p.part('socket-5', box(45, 10, 48, true).translate(588, -93.5, 117.6).scale(scale).color(polymer));
p.part('end-cap--1', box(50, 132, 234, true).translate(-728, 0, 117).scale(scale).color(enamel));
p.part('end-cap-1', box(50, 132, 234, true).translate(728, 0, 117).scale(scale).color(enamel));

return p.model();
