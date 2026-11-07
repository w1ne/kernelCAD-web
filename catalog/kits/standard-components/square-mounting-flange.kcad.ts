// Distinctive geometry: Square flange with a centered through bore, four corner holes and a short neck
meta({
  name: 'square-mounting-flange',
  license: 'CC0-1.0',
  title: 'Square mounting flange',
  description: 'Square flange with a centered through bore, four corner holes and a short neck Knobs: model size, stainless steel, cast iron.',
  tags: ['square flange', 'mounting flange', 'bore mount', 'industrial'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
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
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('square-mounting-flange');
let plate=block(-28*s,-28*s,0,56*s,56*s,6*s);
for (const x of [-19,19]) for (const y of [-19,19]) plate=plate.subtract(cylinder(8*s,3*s,8).translate(x*s,y*s,-s));
a.part('plate',plate.color(castIron));
a.part('neck',cylinder(15*s,16*s,8).subtract(cylinder(18*s,9*s,8).translate(0,0,-s)).translate(0,0,6*s).color(stainless));
return a.model();
