// Straight station platform segment with a raised edge, tactile strip and two access steps.
// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.

meta({
  name: "station-platform",
  license: 'CC0-1.0',
  title: "Station platform",
  description: "Straight station platform segment with a raised edge, tactile strip and two access steps. Editable material controls: concrete, tactile polymer. Includes weathered and fresh service presets.",
  tags: ["station platform", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#aaa79c', { label: 'Concrete' });
const tactilePolymer = param('tactilePolymer', '#e1b33a', { label: 'Tactile polymer' });
presets({
  weathered: { concrete: '#9a968a', tactilePolymer: '#c29e42' },
  freshService: { concrete: '#b8b4a8', tactilePolymer: '#f0c32c' },
});
const p = assembly("station-platform");
p.part("platform", box(1500,600,180,true).translate(0,0,90).scale(scale).translate(0, 0, 0).color(concrete));
p.part("edge", box(1500,80,50,true).translate(0,-340,205).scale(scale).translate(0, 0, 0).color(concrete));
p.part("tactile-strip", box(1460,45,10,true).translate(0,-286,278).scale(scale).translate(0, 0, 0).color(tactilePolymer));
p.part("step-left", box(300,180,50,true).translate(-500,-390,25).scale(scale).translate(0, 0, 0).color(concrete));
p.part("step-right", box(300,180,50,true).translate(500,-390,25).scale(scale).translate(0, 0, 0).color(concrete));

return p.model();
