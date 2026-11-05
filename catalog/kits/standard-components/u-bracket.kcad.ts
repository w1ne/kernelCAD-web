// Distinctive geometry: Open-top channel mounting bracket with a flat back and two parallel side ears
meta({
  name: 'u-bracket',
  license: 'CC0-1.0',
  title: 'U bracket',
  description: 'Open-top channel mounting bracket with a flat back and two parallel side ears Knobs: model size, steel, stainless steel.',
  tags: ['u bracket', 'channel bracket', 'mounting bracket', 'clevis'],
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
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('u-bracket');
a.part('back',block(-28*s,-20*s,0,56*s,40*s,5*s).color(steel));
a.part('left-ear',block(-28*s,-20*s,5*s,5*s,40*s,28*s).color(steel));
a.part('right-ear',block(23*s,-20*s,5*s,5*s,40*s,28*s).color(steel));
a.part('cross-pin',cylinder(40*s,4*s,10).rotateX(90).translate(0,20*s,19*s).color(stainless));
return a.model();
