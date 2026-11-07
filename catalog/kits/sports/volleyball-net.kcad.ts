// Volleyball Net: Portable volleyball net with a dense open cord grid, pale safety band and weighted ground feet. Low-poly sports prop in millimetres, Z up; materials: powder-coated steel, mesh nylon, top safety band, base rubber.
meta({
  name: 'volleyball-net',
  license: 'CC0-1.0',
  title: 'Volleyball net',
  description: "Portable volleyball net with a dense open cord grid, pale safety band and weighted ground feet. Material controls: powder-coated steel, mesh nylon, top safety band, base rubber.",
  tags: ['volleyball net', 'net', 'volleyball', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#697573', { label: 'Powder-coated steel' });
const meshNylon = param('meshNylon', '#dddccf', { label: 'Mesh nylon' });
const safetyBand = param('safetyBand', '#f0eee3', { label: 'Top safety band' });
const baseRubber = param('baseRubber', '#303638', { label: 'Base rubber' });
presets({ clubColors: { powderCoat: '#526c55', meshNylon: '#e6e1d4' } });
const p = assembly('volleyball-net');
p.part('left-post', cylinder(205, 8, 10).translate(-185, 0, 0).scale(scale).color(powderCoat));
p.part('right-post', cylinder(205, 8, 10).translate(185, 0, 0).scale(scale).color(powderCoat));
p.part('top-band', box(370, 14, 12, true).translate(0, 0, 200).scale(scale).color(safetyBand));
p.part('base-left', box(90, 36, 10, true).translate(-185, 0, 5).scale(scale).color(baseRubber));
p.part('base-right', box(90, 36, 10, true).translate(185, 0, 5).scale(scale).color(baseRubber));


// A fine open nylon lattice is tensioned between the posts under the safety band.
for (let i = 0; i <= 18; i++) p.part(`mesh-vertical-${i + 1}`, box(2, 3, 180, true).translate(-175 + i * 19.4, 0, 105).color(meshNylon));
for (let i = 0; i <= 9; i++) p.part(`mesh-horizontal-${i + 1}`, box(358, 3, 2, true).translate(0, 0, 22 + i * 18).color(meshNylon));

return p.model();
