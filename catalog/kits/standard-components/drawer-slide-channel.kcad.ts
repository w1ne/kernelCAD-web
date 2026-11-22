// Distinctive geometry: Nested low-poly slide rails with C-channel lips for a telescoping drawer track
meta({
  name: 'drawer-slide-channel',
  license: 'CC0-1.0',
  title: 'Drawer slide channel',
  description: 'Nested low-poly slide rails with C-channel lips for a telescoping drawer track Knobs: model size, steel, stainless steel.',
  tags: ['drawer slide', 'slide rail', 'channel rail', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
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
const a = assembly('drawer-slide-channel');
a.part('outer-web',block(-60*s,-15*s,0,120*s,30*s,4*s).color(steel));
a.part('outer-left',block(-60*s,-15*s,4*s,120*s,4*s,12*s).color(steel));
a.part('outer-right',block(-60*s,11*s,4*s,120*s,4*s,12*s).color(steel));
a.part('inner-web',block(-45*s,-8*s,8*s,90*s,16*s,4*s).color(stainless));
a.part('inner-lip',block(-45*s,-8*s,12*s,90*s,4*s,8*s).color(stainless));
return a.model();
