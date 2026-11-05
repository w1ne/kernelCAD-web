// Distinctive geometry: Solid round blind pipe flange with four recessed mounting-hole bores
meta({
  name: 'blind-flange',
  license: 'CC0-1.0',
  title: 'Blind flange',
  description: 'Solid round blind pipe flange with four recessed mounting-hole bores Knobs: model size, cast iron, bronze.',
  tags: ['blind flange', 'pipe cap', 'flange', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
const bronze = param('bronze', '#98714c', { label: 'Bronze' });
presets({
  dark: { castIron: '#3b4246', bronze: '#684d37' },
  brass: { castIron: '#69645b', bronze: '#b0804d' },
  weathered: { castIron: '#4d4b46', bronze: '#6e583f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('blind-flange');
let flange=cylinder(8*s,28*s,16);
for (const [x,y] of [[-17,-17],[17,-17],[17,17],[-17,17]]) flange=flange.subtract(cylinder(10*s,3*s,10).translate(x*s,y*s,-s));
a.part('plate',flange.color(castIron));
a.part('hub',cylinder(3*s,10*s,12).translate(0,0,8*s).color(bronze));
return a.model();
