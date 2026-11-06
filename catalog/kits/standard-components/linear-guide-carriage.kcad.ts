// Distinctive geometry: Linear guide carriage with a U-channel underside, paired polymer wipers, top fastener wells, and a brass grease fitting
meta({
  name: 'linear-guide-carriage',
  license: 'CC0-1.0',
  title: 'Linear guide carriage',
  description: 'Steel guide carriage with a U-shaped underside channel, polymer end wipers, four top fastener wells, and a brass grease fitting. Knobs: model size, steel, polymer, brass.',
  tags: ['linear guide carriage', 'rail carriage', 'motion block', 'machine'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 460,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const polymer = param('polymer', '#34393d', { label: 'Engineering polymer' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
presets({
  dark: { steel: '#3e484e', polymer: '#181c1e', brass: '#5a503d' },
  brass: { steel: '#646f75', polymer: '#244956', brass: '#d0a458' },
  weathered: { steel: '#665b4d', polymer: '#514438', brass: '#64734c' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('linear-guide-carriage');
const shoe = block(-22*s, -20*s, 0, 44*s, 40*s, 20*s)
  .subtract(block(-18*s, -8*s, -s, 36*s, 16*s, 13*s));
a.part('steel-body', shoe.color(steel));

let topPad = block(-16*s, -14*s, 20*s, 32*s, 28*s, 5*s);
for (const x of [-10, 10]) {
  for (const y of [-8, 8]) {
    topPad = topPad.subtract(cylinder(6*s, 2.25*s, 12).translate(x*s, y*s, 19.5*s));
  }
}
a.part('mounting-pad', topPad.color(steel));

for (const [name, x] of [['left', -23], ['right', 21.9]] as const) {
  const cap = (y: number, z: number, depth: number, height: number) =>
    block(x*s, y*s, z*s, 1.1*s, depth*s, height*s).color(polymer);
  a.part(`${name}-wiper-front`, cap(-18, 2, 10, 16));
  a.part(`${name}-wiper-back`, cap(8, 2, 10, 16));
  a.part(`${name}-wiper-bridge`, cap(-8, 12, 16, 6));
}
a.part('grease-fitting-base', cylinder(1.5*s, 3*s, 12).translate(0, 0, 25*s).color(brass));
a.part('grease-nipple', cylinder(3*s, 1.4*s, 10).translate(0, 0, 26.2*s).color(brass));
return a.model();
