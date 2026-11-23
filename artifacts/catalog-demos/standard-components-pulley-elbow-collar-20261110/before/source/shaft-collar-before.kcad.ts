// Distinctive geometry: One-piece round shaft collar with a centered bore and a small radial set-screw boss
meta({
  name: 'shaft-collar',
  license: 'CC0-1.0',
  title: 'Shaft collar',
  description: 'One-piece round shaft collar with a centered bore and a small radial set-screw boss Knobs: model size, steel, zinc-plated steel.',
  tags: ['shaft collar', 'set collar', 'shaft hardware', 'rotating shaft'],
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
const a = assembly('shaft-collar');
a.part('ring',cylinder(12*s,19*s,16).subtract(cylinder(14*s,10*s,16).translate(0,0,-s)).color(steel));
a.part('boss',cylinder(8*s,5*s,10).rotateX(90).translate(0,19*s,8*s).color(zinc));
return a.model();
