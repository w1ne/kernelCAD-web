// Distinctive geometry: Slender beam-style flexible shaft coupling with two end hubs and a slotted center sleeve
meta({
  name: 'beam-coupling',
  license: 'CC0-1.0',
  title: 'Beam coupling',
  description: 'Slender beam-style flexible shaft coupling with two end hubs and a slotted center sleeve Knobs: model size, steel, aluminum.',
  tags: ['beam coupling', 'flexible coupling', 'shaft coupling', 'rotary'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 480,
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
const a = assembly('beam-coupling');
let sleeve=cylinder(30*s,14*s,8).subtract(cylinder(32*s,8*s,8).translate(0,0,-s));
for (const angle of [0,90,180,270]) sleeve=sleeve.subtract(block(-2*s,-16*s,4*s,4*s,8*s,22*s).rotateZ(angle));
a.part('sleeve',sleeve.color(aluminum));
a.part('end-a',cylinder(6*s,18*s,8).subtract(cylinder(8*s,8*s,8).translate(0,0,-s)).color(steel));
a.part('end-b',cylinder(6*s,18*s,8).subtract(cylinder(8*s,8*s,8).translate(0,0,-s)).translate(0,0,24*s).color(steel));
return a.model();
