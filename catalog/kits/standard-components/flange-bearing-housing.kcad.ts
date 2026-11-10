// A two-hole cast-iron flange bearing housing with a steel race and a separate rubber lip seal around its through-bore.
meta({
  name: 'flange-bearing-housing',
  license: 'CC0-1.0',
  title: 'Flange bearing housing',
  description: 'Two-hole cast-iron bearing housing with a raised boss, visible steel bearing race, rubber lip seal and through-bore. Knobs: model size, cast iron, bearing steel and seal rubber.',
  tags: ['bearing housing', 'flange bearing', 'shaft support', 'mount'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
const bearingSteel = param('bearingSteel', '#aeb9be', { label: 'Bearing steel' });
const sealRubber = param('sealRubber', '#353b3d', { label: 'Seal rubber' });
presets({
  factory: { castIron: '#68747a', bearingSteel: '#c2c9cc', sealRubber: '#303436' },
  weathered: { castIron: '#4d4b46', bearingSteel: '#8d9698', sealRubber: '#51473d' },
  highVisibility: { castIron: '#e2a62d', bearingSteel: '#c4cdd1', sealRubber: '#202426' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('flange-bearing-housing');
let plate = box(56*s, 36*s, 8*s).translate(-28*s, -18*s, 0);
plate = plate.subtract(cylinder(10*s, 8.2*s, 12).translate(0, 0, -s));
for (const x of [-19, 19]) plate = plate.subtract(cylinder(10*s, 3*s, 10).translate(x*s, 0, -s));
a.part('plate',plate.color(castIron));
const boss = cylinder(16*s, 20*s, 12).translate(0, 0, 8*s)
  .subtract(cylinder(18*s, 14*s, 12).translate(0, 0, 7*s));
a.part('housing-boss', boss.color(castIron));
const race = cylinder(12*s, 13.5*s, 12).translate(0, 0, 10*s)
  .subtract(cylinder(14*s, 8*s, 12).translate(0, 0, 9*s));
a.part('bearing-race', race.color(bearingSteel));
const lipSeal = cylinder(2*s, 10*s, 12).translate(0, 0, 22*s)
  .subtract(cylinder(4*s, 8*s, 12).translate(0, 0, 21*s));
a.part('lip-seal', lipSeal.color(sealRubber));
return a.model();
