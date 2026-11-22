// Distinctive geometry: Stepped hollow reducer joining a larger pipe end to a smaller pipe end
meta({
  name: 'pipe-reducer',
  license: 'CC0-1.0',
  title: 'Pipe reducer',
  description: 'Stepped hollow reducer joining a larger pipe end to a smaller pipe end Knobs: model size, steel, bronze.',
  tags: ['pipe reducer', 'reducer fitting', 'pipe adapter', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const bronze = param('bronze', '#98714c', { label: 'Bronze' });
presets({
  dark: { steel: '#3e484e', bronze: '#684d37' },
  brass: { steel: '#646f75', bronze: '#b0804d' },
  weathered: { steel: '#665b4d', bronze: '#6e583f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('pipe-reducer');
a.part('large-end',cylinder(10*s,22*s,14).subtract(cylinder(12*s,16*s,12).translate(0,0,-s)).color(steel));
a.part('transition',cylinder(24*s,16*s,12).subtract(cylinder(26*s,11*s,12).translate(0,0,-s)).translate(0,0,10*s).color(bronze));
a.part('small-end',cylinder(12*s,13*s,12).subtract(cylinder(14*s,10*s,12).translate(0,0,-s)).translate(0,0,34*s).color(steel));
return a.model();
