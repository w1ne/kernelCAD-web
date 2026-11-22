// Distinctive geometry: Compact union fitting with two hollow sockets and a broad central hex-like nut body
meta({
  name: 'pipe-union',
  license: 'CC0-1.0',
  title: 'Pipe union',
  description: 'Compact union fitting with two hollow sockets and a broad central hex-like nut body Knobs: model size, steel, brass.',
  tags: ['pipe union', 'union fitting', 'pipe connector', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
presets({
  dark: { steel: '#3e484e', brass: '#725938' },
  brass: { steel: '#646f75', brass: '#c0944d' },
  weathered: { steel: '#665b4d', brass: '#8c734d' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('pipe-union');
a.part('socket-a',cylinder(12*s,16*s,12).subtract(cylinder(14*s,10*s,12).translate(0,0,-s)).color(steel));
a.part('nut',block(-18*s,-18*s,12*s,36*s,36*s,12*s).subtract(cylinder(14*s,10*s,12).translate(0,0,11*s)).color(brass));
a.part('socket-b',cylinder(12*s,16*s,12).subtract(cylinder(14*s,10*s,12).translate(0,0,-s)).translate(0,0,24*s).color(steel));
return a.model();
