// Distinctive geometry: Small edge clamp with a broad base, upright jaw and adjustable pressure pad
meta({
  name: 'panel-clamp',
  license: 'CC0-1.0',
  title: 'Panel clamp',
  description: 'Small edge clamp with a broad base, upright jaw and adjustable pressure pad Knobs: model size, steel, zinc-plated steel, rubber.',
  tags: ['panel clamp', 'edge clamp', 'mounting hardware', 'fixture'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 320,
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
const a = assembly('panel-clamp');
a.part('base',block(-24*s,-20*s,0,48*s,40*s,6*s).color(steel));
a.part('jaw',block(-24*s,14*s,6*s,48*s,6*s,27*s).color(steel));
a.part('screw',cylinder(14*s,4*s,10).translate(0,-2*s,9*s).color(zinc));
a.part('pad',block(-10*s,-8*s,20*s,20*s,16*s,5*s).color(rubber));
return a.model();
