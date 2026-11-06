// Tennis Net: Practice tennis net with taut vertical and horizontal mesh cords, a reinforced top band and grounded posts. Low-poly sports prop in millimetres, Z up; materials: powder-coated steel, net nylon, base rubber.
meta({
  name: 'tennis-net',
  license: 'CC0-1.0',
  title: 'Tennis net',
  description: "Practice tennis net with taut vertical and horizontal mesh cords, a reinforced top band and grounded posts. Material controls: powder-coated steel, net nylon, base rubber.",
  tags: ['tennis net', 'net', 'tennis court', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#6d7471', { label: 'Powder-coated steel' });
const netNylon = param('netNylon', '#dddccf', { label: 'Net nylon' });
const baseRubber = param('baseRubber', '#303638', { label: 'Base rubber' });
presets({ clubColors: { powderCoat: '#526d56', netNylon: '#e6e1d4' } });
const p = assembly('tennis-net');
p.part('left-post', cylinder(145, 7, 10).translate(-220, 0, 0).scale(scale).color(powderCoat));
p.part('right-post', cylinder(145, 7, 10).translate(220, 0, 0).scale(scale).color(powderCoat));
p.part('top-band', box(445, 12, 12, true).translate(0, 0, 145).scale(scale).color(powderCoat));
p.part('base-left', box(72, 32, 8, true).translate(-220, 0, 4).scale(scale).color(baseRubber));
p.part('base-right', box(72, 32, 8, true).translate(220, 0, 4).scale(scale).color(baseRubber));


// Thin nylon cords make the practice net open and visibly woven, not a flat slab.
for (let i = 0; i <= 18; i++) p.part(`mesh-vertical-${i + 1}`, box(2, 2.5, 116, true).translate(-210 + i * 23.3, 0, 85).color(netNylon));
for (let i = 0; i <= 6; i++) p.part(`mesh-horizontal-${i + 1}`, box(430, 2.5, 2, true).translate(0, 0, 30 + i * 18).color(netNylon));

return p.model();
