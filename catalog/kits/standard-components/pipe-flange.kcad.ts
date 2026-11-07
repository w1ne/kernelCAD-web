// Distinctive geometry: Round slip-on pipe flange with a center bore and four bolt-hole positions
meta({
  name: 'pipe-flange',
  license: 'CC0-1.0',
  title: 'Pipe flange',
  description: 'Round slip-on pipe flange with a center bore and four bolt-hole positions Knobs: model size, stainless steel, cast iron.',
  tags: ['pipe flange', 'flange', 'pipe fitting', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 450,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
presets({
  dark: { stainless: '#7d8a91', castIron: '#3b4246' },
  brass: { stainless: '#b38b52', castIron: '#69645b' },
  weathered: { stainless: '#8b8275', castIron: '#4d4b46' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('pipe-flange');
let flange=cylinder(6*s,28*s,8).subtract(cylinder(8*s,12*s,8).translate(0,0,-s));
for (const [x,y] of [[-17,-17],[17,-17],[17,17],[-17,17]]) flange=flange.subtract(cylinder(8*s,3*s,8).translate(x*s,y*s,-s));
a.part('flange',flange.color(castIron));
a.part('neck',cylinder(18*s,13*s,8).subtract(cylinder(20*s,11*s,8).translate(0,0,-s)).translate(0,0,6*s).color(stainless));
return a.model();
