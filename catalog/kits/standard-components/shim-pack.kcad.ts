// Distinctive geometry: Stack of thin rectangular alignment shims with small offset pull tabs
meta({
  name: 'shim-pack',
  license: 'CC0-1.0',
  title: 'Shim pack',
  description: 'Stack of thin rectangular alignment shims with small offset pull tabs Knobs: model size, steel, stainless steel, brass.',
  tags: ['shim', 'shim pack', 'alignment', 'machine setup'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 280,
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
const a = assembly('shim-pack');
for (const i of [0,1,2,3]) {
  const layer = block(-22*s+(i/2)*s,-16*s, i*1.5*s,44*s,32*s,1.5*s);
  if (i % 2 === 0) a.part(`shim-${i}`,layer.color(steel));
  else a.part(`shim-${i}`,layer.color(stainless));
}
a.part('tabs',block(15*s,-4*s,0,12*s,8*s,8*s).color(brass));
return a.model();
