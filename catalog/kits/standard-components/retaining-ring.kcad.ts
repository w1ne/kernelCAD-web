// Distinctive geometry: Open retaining ring profile with two small installation ears
meta({
  name: 'retaining-ring',
  license: 'CC0-1.0',
  title: 'Retaining ring',
  description: 'Open retaining ring profile with two small installation ears Knobs: model size, stainless steel, spring steel.',
  tags: ['retaining ring', 'circlip', 'shaft retainer', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
const springSteel = param('springSteel', '#78868e', { label: 'Spring steel' });
presets({
  dark: { stainless: '#7d8a91', springSteel: '#4c585e' },
  brass: { stainless: '#b38b52', springSteel: '#75838a' },
  weathered: { stainless: '#8b8275', springSteel: '#5b5550' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('retaining-ring');
let ring=cylinder(3*s,20*s,16).subtract(cylinder(5*s,16*s,16).translate(0,0,-s));
ring=ring.subtract(block(-3*s,15*s,-s,6*s,10*s,5*s));
a.part('ring',ring.color(springSteel));
a.part('ear-left',block(-9*s,17*s,0,6*s,7*s,3*s).color(stainless));
a.part('ear-right',block(3*s,17*s,0,6*s,7*s,3*s).color(stainless));
return a.model();
