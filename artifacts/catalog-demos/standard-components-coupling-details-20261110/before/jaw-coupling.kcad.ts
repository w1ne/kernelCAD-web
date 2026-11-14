// Distinctive geometry: Two jaw hubs with a visible flexible center spider between the shaft bores
meta({
  name: 'jaw-coupling',
  license: 'CC0-1.0',
  title: 'Jaw coupling',
  description: 'Two jaw hubs with a visible flexible center spider between the shaft bores Knobs: model size, steel, engineering polymer.',
  tags: ['jaw coupling', 'flexible coupling', 'shaft connector', 'rotary'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
presets({
  dark: { steel: '#3e484e', polymer: '#244956' },
  brass: { steel: '#646f75', polymer: '#1d5364' },
  weathered: { steel: '#665b4d', polymer: '#96734f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('jaw-coupling');
a.part('hub-a',cylinder(16*s,18*s,14).subtract(cylinder(18*s,8*s,12).translate(0,0,-s)).color(steel));
a.part('spider',cylinder(8*s,14*s,12).translate(0,0,16*s).color(polymer));
a.part('hub-b',cylinder(16*s,18*s,14).subtract(cylinder(18*s,8*s,12).translate(0,0,-s)).translate(0,0,24*s).color(steel));
return a.model();
