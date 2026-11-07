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
  triangleBudget: 360,
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
a.part('base',block(-32*s,-20*s,0,64*s,40*s,7*s).color(castIron));
a.part('left-foot',block(-32*s,-20*s,0,16*s,40*s,13*s).color(zinc));
a.part('right-foot',block(16*s,-20*s,0,16*s,40*s,13*s).color(zinc));
a.part('bearing',cylinder(22*s,20*s,16).subtract(cylinder(24*s,10*s,12).translate(0,0,-s)).translate(0,0,7*s).color(bronze));
return a.model();
