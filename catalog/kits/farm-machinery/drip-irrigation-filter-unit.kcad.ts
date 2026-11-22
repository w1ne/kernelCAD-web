// SPDX-License-Identifier: CC0-1.0
// Field irrigation manifold with filter vessels, pressure chamber, valve branch and skid base.
meta({
  name: "drip-irrigation-filter-unit",
  license: 'CC0-1.0',
  title: "Drip-irrigation filter unit",
  description: "Field irrigation manifold with filter vessels, pressure chamber, valve branch and skid base. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', steelColor: '#abb2ad' },
});
const p = assembly('drip-irrigation-filter-unit');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('irrigation-skid', box(1300, 730, 42, true).translate(0, 0, 21), paintedSteelColor);
add('filter-vessel-0', cylinder(1073, 90, 10).translate(-442, 0, 42), paintedSteelColor);
add('vessel-rim-0', cylinder(35, 105, 10).translate(-442, 0, 1044), steelColor);
add('filter-vessel-1', cylinder(1073, 90, 10).translate(0, 0, 42), paintedSteelColor);
add('vessel-rim-1', cylinder(35, 105, 10).translate(0, 0, 1044), steelColor);
add('filter-vessel-2', cylinder(1073, 90, 10).translate(442, 0, 42), paintedSteelColor);
add('vessel-rim-2', cylinder(35, 105, 10).translate(442, 0, 1044), steelColor);
add('water-header', box(1118, 70, 70, true).translate(0, 292, 832.5), paintedSteelColor);
add('valve-0', cylinder(100, 18, 8).translate(-325, 292, 841), steelColor);
add('valve-1', cylinder(100, 18, 8).translate(0, 292, 841), steelColor);
add('valve-2', cylinder(100, 18, 8).translate(325, 292, 841), steelColor);

return p.model();
