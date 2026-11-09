// Distinctive geometry: Raised pillow-block support with a broad base, round bearing boss and two bolt feet
meta({
  name: 'pillow-block-housing',
  license: 'CC0-1.0',
  title: 'Pillow block housing',
  description: 'Raised pillow-block support with a broad base, round bearing boss and two bolt feet Knobs: model size, zinc-plated steel, cast iron, bronze.',
  tags: ['pillow block', 'bearing housing', 'shaft support', 'machine'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 480,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated steel' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
const bronze = param('bronze', '#98714c', { label: 'Bronze' });
presets({
  dark: { zinc: '#929da3', castIron: '#3b4246', bronze: '#684d37' },
  brass: { zinc: '#c29a5c', castIron: '#69645b', bronze: '#b0804d' },
  weathered: { zinc: '#a19682', castIron: '#4d4b46', bronze: '#6e583f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('pillow-block-housing');
// A pillow bearing supports a HORIZONTAL shaft, not a vertical through-bore.
// This is a visual CC0 prop; it is not a dimensioned vendor housing.
let base=block(-42*s,-21*s,0,84*s,42*s,7*s);
for (const x of [-30,30]) base=base.subtract(cylinder(9*s,4*s,16).translate(x*s,0,-s));
a.part('two-bolt-base',base.color(castIron));
a.part('support-riser',block(-18*s,-12*s,7*s,36*s,24*s,20*s).color(castIron));
const housing=cylinder(20*s,22*s,24).subtract(cylinder(22*s,11*s,24).translate(0,0,-s));
a.part('horizontal-bearing-housing',housing.rotateX(90).translate(0,10*s,28*s).color(castIron));
const insert=cylinder(18*s,11*s,24).subtract(cylinder(20*s,7*s,24).translate(0,0,-s));
a.part('inner-bearing-ring',insert.rotateX(90).translate(0,9*s,28*s).color(zinc));
a.part('grease-nipple',cylinder(5*s,3*s,12).translate(0,0,49*s).color(bronze));
return a.model();
