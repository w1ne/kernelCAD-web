// Distinctive geometry: Stepped hose-barb adapter with a hollow center and three grip ribs
meta({
  name: 'hose-barb-adapter',
  license: 'CC0-1.0',
  title: 'Hose barb adapter',
  description: 'Stepped hose-barb adapter with a hollow center and three grip ribs Knobs: model size, steel, stainless steel, brass.',
  tags: ['hose barb', 'hose adapter', 'barbed fitting', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91', brass: '#725938' },
  brass: { steel: '#646f75', stainless: '#b38b52', brass: '#c0944d' },
  weathered: { steel: '#665b4d', stainless: '#8b8275', brass: '#8c734d' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('hose-barb-adapter');
a.part('stem',cylinder(28*s,10*s,8).subtract(cylinder(30*s,6*s,8).translate(0,0,-s)).color(stainless));
for (const z of [6,13,20]) a.part(`barb-${z}`,cylinder(3*s,(z===20?13:12)*s,8).subtract(cylinder(5*s,6*s,8).translate(0,0,-s)).translate(0,0,z*s).color(steel));
a.part('hex-body',block(-14*s,-14*s,28*s,28*s,28*s,8*s).subtract(cylinder(10*s,6*s,8).translate(0,0,27*s)).color(brass));
return a.model();
