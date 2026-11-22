// Distinctive geometry: Adjustable leveling foot with a wide circular pad and centered support stem
meta({
  name: 'leveling-foot',
  license: 'CC0-1.0',
  title: 'Leveling foot',
  description: 'Adjustable leveling foot with a wide circular pad and centered support stem Knobs: model size, steel, zinc-plated steel, rubber.',
  tags: ['leveling foot', 'machine foot', 'adjuster', 'mount'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 280,
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
const a = assembly('leveling-foot');
a.part('pad',cylinder(8*s,22*s,16).translate(0,0,0).color(rubber));
a.part('stem',cylinder(24*s,6*s,12).translate(0,0,8*s).color(steel));
a.part('seat',cylinder(4*s,10*s,12).translate(0,0,28*s).color(zinc));
return a.model();
