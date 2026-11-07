// Distinctive geometry: Short hollow straight coupling sleeve with raised end collars
meta({
  name: 'pipe-coupling',
  license: 'CC0-1.0',
  title: 'Pipe coupling sleeve',
  description: 'Short hollow straight coupling sleeve with raised end collars Knobs: model size, steel, stainless steel.',
  tags: ['pipe coupling', 'sleeve coupling', 'pipe fitting', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 320,
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
const a = assembly('pipe-coupling');
a.part('sleeve',cylinder(28*s,17*s,14).subtract(cylinder(30*s,12*s,12).translate(0,0,-s)).color(steel));
a.part('collar-a',cylinder(4*s,19*s,14).subtract(cylinder(6*s,12*s,12).translate(0,0,-s)).color(stainless));
a.part('collar-b',cylinder(4*s,19*s,14).subtract(cylinder(6*s,12*s,12).translate(0,0,-s)).translate(0,0,24*s).color(stainless));
return a.model();
