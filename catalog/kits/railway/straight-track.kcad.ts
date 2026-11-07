// Short straight rail section with twin rails, six sleepers, tie plates and gravel ballast base.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "straight-track",
  license: 'CC0-1.0',
  title: "Straight railway track",
  description: "Short straight rail section with twin rails, six sleepers, tie plates and gravel ballast base. Editable material controls: track ballast, rail and running gear steel, concrete. Includes weathered and fresh service presets.",
  tags: ["straight track", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const ballast = param('ballast', '#706b62', { label: 'Track ballast' });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const concrete = param('concrete', '#aaa79c', { label: 'Concrete' });
presets({
  weathered: { ballast: '#706a60', railSteel: '#666a6a', concrete: '#9a968a' },
  freshService: { ballast: '#797367', railSteel: '#56636a', concrete: '#b8b4a8' },
});
const p = assembly("straight-track");
p.part("ballast", box(1500,330,36,true).translate(0,0,18).scale(scale).translate(0, 0, 0).color(ballast));
p.part("rail-left", box(1500,34,54,true).translate(0,-84,63).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("rail-right", box(1500,34,54,true).translate(0,84,63).scale(scale).translate(0, 0, 0).color(railSteel));
p.part("sleeper-1", box(38,300,36,true).translate(-650,0,36).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-2", box(38,300,36,true).translate(-390,0,36).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-3", box(38,300,36,true).translate(-130,0,36).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-4", box(38,300,36,true).translate(130,0,36).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-5", box(38,300,36,true).translate(390,0,36).scale(scale).translate(0, 0, 0).color(concrete));
p.part("sleeper-6", box(38,300,36,true).translate(650,0,36).scale(scale).translate(0, 0, 0).color(concrete));

return p.model();
