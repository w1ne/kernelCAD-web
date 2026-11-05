// Distinctive geometry: Short symmetric top-hat rail profile with a flat web and raised edge lips
meta({
  name: 'din-rail',
  license: 'CC0-1.0',
  title: 'DIN rail',
  description: 'Short symmetric top-hat rail profile with a flat web and raised edge lips Knobs: model size, steel, stainless steel, aluminum.',
  tags: ['din rail', 'mounting rail', 'control cabinet', 'electrical'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
const aluminum = param('aluminum', '#aebac0', { label: 'Aluminum' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91', aluminum: '#586970' },
  brass: { steel: '#646f75', stainless: '#b38b52', aluminum: '#aab8bc' },
  weathered: { steel: '#665b4d', stainless: '#8b8275', aluminum: '#788177' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('din-rail');
a.part('web',block(-55*s,-18*s,0,110*s,36*s,4*s).color(steel));
a.part('left-lip',block(-55*s,-18*s,4*s,110*s,5*s,8*s).color(aluminum));
a.part('right-lip',block(-55*s,13*s,4*s,110*s,5*s,8*s).color(aluminum));
a.part('ridge',block(-55*s,-6*s,4*s,110*s,12*s,4*s).color(stainless));
return a.model();
