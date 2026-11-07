// Distinctive geometry: Two-hole clamp with a semicircular lined saddle, paired side cheeks, and a raised retainer bridge.
meta({
  name: 'tube-clamp',
  license: 'CC0-1.0',
  title: 'Tube clamp',
  description: 'Two-hole clamp with a semicircular lined saddle, paired side cheeks, and a raised retainer bridge. Knobs: model size, steel, zinc-plated steel, rubber.',
  tags: ['tube clamp', 'pipe clamp', 'retainer', 'mount'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated steel' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber' });
presets({
  dark: { steel: '#3e484e', zinc: '#929da3', rubber: '#242729' },
  brass: { steel: '#646f75', zinc: '#c29a5c', rubber: '#2a2d2f' },
  weathered: { steel: '#665b4d', zinc: '#a19682', rubber: '#3b3935' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('tube-clamp');
const base=block(-26*s,-18*s,0,52*s,36*s,7*s).subtract(cylinder(36*s,8*s,12).rotateX(90).translate(0,18*s,12*s));
a.part('base',base.color(steel));
a.part('left-cheek',block(-26*s,-18*s,7*s,10*s,36*s,17*s).color(steel));
a.part('right-cheek',block(16*s,-18*s,7*s,10*s,36*s,17*s).color(steel));
a.part('bridge',block(-16*s,-18*s,19*s,32*s,36*s,5*s).color(zinc));
a.part('rubber-saddle',cylinder(36*s,7.8*s,12).subtract(cylinder(38*s,6.2*s,12).translate(0,0,-s)).rotateX(90).translate(0,18*s,12*s).color(rubber));
return a.model();
