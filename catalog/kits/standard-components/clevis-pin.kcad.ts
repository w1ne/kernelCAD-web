// Distinctive geometry: Round headed clevis pin with a straight shank and cross-hole collar
meta({
  name: 'clevis-pin',
  license: 'CC0-1.0',
  title: 'Clevis pin',
  description: 'Round headed clevis pin with a straight shank and cross-hole collar Knobs: model size, steel, stainless steel.',
  tags: ['clevis pin', 'pivot pin', 'linkage hardware', 'fastener'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 280,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91' },
  brass: { steel: '#646f75', stainless: '#b38b52' },
  weathered: { steel: '#665b4d', stainless: '#8b8275' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('clevis-pin');
let shank=cylinder(34*s,5*s,12);
shank=shank.subtract(cylinder(10*s,2*s,10).rotateX(90).translate(0,5*s,28*s));
a.part('shank',shank.color(steel));
a.part('head',cylinder(5*s,10*s,12).translate(0,0,34*s).color(stainless));
return a.model();
