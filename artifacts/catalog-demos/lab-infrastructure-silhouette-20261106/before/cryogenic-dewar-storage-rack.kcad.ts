// SPDX-License-Identifier: CC0-1.0
// Floor rack for sample dewars with paired retaining hoops, shelves and anchor feet.
meta({
  name: 'cryogenic-dewar-storage-rack',
  license: 'CC0-1.0',
  title: 'Cryogenic dewar storage rack',
  description: 'Floor rack for sample dewars with paired retaining hoops, shelves and anchor feet. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
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
const p = assembly('cryogenic-dewar-storage-rack');
p.part('base-frame', box(1000, 480, 38, true).translate(0, 0, 19).scale(scale).color(steel));
p.part('upright--420-0', box(38, 38, 1450, true).translate(-420, 0, 725).scale(scale).color(steel));
p.part('upright-420-0', box(38, 38, 1450, true).translate(420, 0, 725).scale(scale).color(steel));
p.part('top-retainer', box(1000, 34, 50, true).translate(0, 0, 1390).scale(scale).color(enamel));
p.part('dewar-body-0', cylinder(1044, 95, 10).translate(-310, 0, 45).scale(scale).color(stainless));
p.part('dewar-neck-0', cylinder(174, 40, 10).translate(-310, 0, 1089).scale(scale).color(enamel));
p.part('retaining-strap-0', box(180, 20, 22, true).translate(-310, -220.8, 808.5).scale(scale).color(steel));
p.part('dewar-body-1', cylinder(1044, 95, 10).translate(0, 0, 45).scale(scale).color(stainless));
p.part('dewar-neck-1', cylinder(174, 40, 10).translate(0, 0, 1089).scale(scale).color(enamel));
p.part('retaining-strap-1', box(180, 20, 22, true).translate(0, -220.8, 808.5).scale(scale).color(steel));
p.part('dewar-body-2', cylinder(1044, 95, 10).translate(310, 0, 45).scale(scale).color(stainless));
p.part('dewar-neck-2', cylinder(174, 40, 10).translate(310, 0, 1089).scale(scale).color(enamel));
p.part('retaining-strap-2', box(180, 20, 22, true).translate(310, -220.8, 808.5).scale(scale).color(steel));

return p.model();
