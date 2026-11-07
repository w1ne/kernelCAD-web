// Distinctive geometry: Split clamp collar with a through bore and a raised clamp lug
meta({
  name: 'split-shaft-collar',
  license: 'CC0-1.0',
  title: 'Split shaft collar',
  description: 'Split clamp collar with a through bore and a raised clamp lug Knobs: model size, steel, zinc-plated steel.',
  tags: ['shaft collar', 'split collar', 'clamp', 'rotating shaft'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
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
const a = assembly('split-shaft-collar');
let collar=cylinder(10*s,18*s,16).subtract(cylinder(12*s,9*s,16).translate(0,0,-s));
collar=collar.subtract(block(-2*s,8*s,-s,4*s,12*s,12*s));
a.part('collar',collar.color(steel));
a.part('lug',block(12*s,11*s,2*s,10*s,8*s,8*s).color(zinc));
return a.model();
