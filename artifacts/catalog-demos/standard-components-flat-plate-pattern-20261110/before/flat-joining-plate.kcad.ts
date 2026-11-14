// Distinctive geometry: Flat strap plate with four zinc-plated fastener heads seated in its mounting holes for joining two parts in line.
meta({
  name: 'flat-joining-plate',
  license: 'CC0-1.0',
  title: 'Flat joining plate',
  description: 'Flat strap plate with four zinc-plated fastener heads seated in its mounting holes for joining two parts in line. Knobs: model size, steel, zinc-plated steel.',
  tags: ['joining plate', 'strap plate', 'mounting plate', 'connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 620,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated steel' });
presets({
  dark: { steel: '#3e484e', zinc: '#929da3' },
  brass: { steel: '#646f75', zinc: '#c29a5c' },
  weathered: { steel: '#665b4d', zinc: '#a19682' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('flat-joining-plate');
const t=5*s;
let plate=block(-42*s,-12*s,0,84*s,24*s,t);
for (const x of [-30,-10,10,30]) plate=plate.subtract(cylinder(t+2*s,3*s,10).translate(x*s,0,-s));
a.part('plate',plate.color(steel));
for (const [i, x] of [-30,-10,10,30].entries()) {
  a.part(`bolt-shank-${i}`,cylinder(t,2.3*s,8).translate(x*s,0,0).color(zinc));
  a.part(`bolt-head-${i}`,cylinder(2.5*s,4*s,6).translate(x*s,0,t).color(zinc));
}
return a.model();
