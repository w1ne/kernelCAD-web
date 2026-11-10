// Distinctive geometry: Compact linear motion rail with a broad mounting foot and raised central raceway
meta({
  name: 'linear-guide-rail',
  license: 'CC0-1.0',
  title: 'Linear guide rail',
  description: 'Compact linear motion rail with a broad mounting foot and raised central raceway Knobs: model size, steel, aluminum.',
  tags: ['linear guide', 'guide rail', 'motion rail', 'machine'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const aluminum = param('aluminum', '#aebac0', { label: 'Aluminum' });
presets({
  dark: { steel: '#3e484e', aluminum: '#586970' },
  brass: { steel: '#646f75', aluminum: '#aab8bc' },
  weathered: { steel: '#665b4d', aluminum: '#788177' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('linear-guide-rail');
let base=block(-60*s,-16*s,0,120*s,32*s,7*s);
for (const x of [-45,-15,15,45]) base=base.subtract(cylinder(9*s,3*s,10).translate(x*s,0,-s));
a.part('base',base.color(aluminum));
a.part('raceway',block(-60*s,-7*s,7*s,120*s,14*s,8*s).color(steel));
return a.model();
