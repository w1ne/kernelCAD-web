// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly drip-irrigation filter unit scene prop, modeled from scratch.
meta({
  name: "drip-irrigation-filter-unit",
  license: 'CC0-1.0',
  title: "Drip-irrigation filter unit",
  description: "Field irrigation manifold with filter vessels, pressure chamber, valve branch and skid base. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('drip-irrigation-filter-unit');
const groundOffset = 0;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('irrigation-skid', box(1300, 730, 42, true).translate(0, 0, 21), accent);
add('filter-vessel-0', cylinder(1073, 90, 10).translate(-442, 0, 42), body);
add('vessel-rim-0', cylinder(35, 105, 10).translate(-442, 0, 1044), accent);
add('filter-vessel-1', cylinder(1073, 90, 10).translate(0, 0, 42), body);
add('vessel-rim-1', cylinder(35, 105, 10).translate(0, 0, 1044), accent);
add('filter-vessel-2', cylinder(1073, 90, 10).translate(442, 0, 42), body);
add('vessel-rim-2', cylinder(35, 105, 10).translate(442, 0, 1044), accent);
add('water-header', box(1118, 70, 70, true).translate(0, 292, 832.5), accent);
add('valve-0', cylinder(100, 18, 8).translate(-325, 292, 841), body);
add('valve-1', cylinder(100, 18, 8).translate(0, 292, 841), body);
add('valve-2', cylinder(100, 18, 8).translate(325, 292, 841), body);

return p.model();
