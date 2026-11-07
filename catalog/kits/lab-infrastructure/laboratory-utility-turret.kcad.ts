// SPDX-License-Identifier: CC0-1.0
// Floor-to-ceiling service turret with layered panels, utility sockets and a cap rail.
meta({
  name: 'laboratory-utility-turret',
  license: 'CC0-1.0',
  title: 'Laboratory utility turret',
  description: 'Floor-to-ceiling service turret with layered panels, utility sockets and a cap rail. Editable material controls: enamel coating, polymer controls, structural steel; presets: cleanroom and high visibility.',
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
const p = assembly('laboratory-utility-turret');
p.part('turret-core', box(280, 240, 2100, true).translate(0, 0, 1050).scale(scale).color(enamel));
p.part('base-plinth', box(420, 360, 75, true).translate(0, 0, 37.5).scale(scale).color(steel));
p.part('service-cap', box(364, 312, 60, true).translate(0, 0, 2100).scale(scale).color(enamel));
p.part('turret-port-0', box(173.6, 22, 64, true).translate(0, -132, 212).scale(scale).color(enamel));
p.part('port-socket-0', box(61.6, 12, 30, true).translate(0, -168, 195).scale(scale).color(polymer));
p.part('turret-port-1', box(173.6, 22, 64, true).translate(0, -132, 647).scale(scale).color(enamel));
p.part('port-socket-1', box(61.6, 12, 30, true).translate(0, -168, 630).scale(scale).color(polymer));
p.part('turret-port-2', box(173.6, 22, 64, true).translate(0, -132, 1082).scale(scale).color(enamel));
p.part('port-socket-2', box(61.6, 12, 30, true).translate(0, -168, 1065).scale(scale).color(polymer));
p.part('turret-port-3', box(173.6, 22, 64, true).translate(0, -132, 1517).scale(scale).color(enamel));
p.part('port-socket-3', box(61.6, 12, 30, true).translate(0, -168, 1500).scale(scale).color(polymer));
p.part('turret-port-4', box(173.6, 22, 64, true).translate(0, -132, 1952).scale(scale).color(enamel));
p.part('port-socket-4', box(61.6, 12, 30, true).translate(0, -168, 1935).scale(scale).color(polymer));

return p.model();
