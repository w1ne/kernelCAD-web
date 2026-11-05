// Distinctive geometry: Three-way T pipe fitting with a vertical run and perpendicular side branch
meta({
  name: 'pipe-tee',
  license: 'CC0-1.0',
  title: 'Pipe tee fitting',
  description: 'Three-way T pipe fitting with a vertical run and perpendicular side branch Knobs: model size, steel, bronze.',
  tags: ['pipe tee', 'tee fitting', 'plumbing', 'pipe connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
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
const a = assembly('pipe-tee');
const r=12*s;
a.part('run',cylinder(44*s,r,12).subtract(cylinder(46*s,8*s,12).translate(0,0,-s)).color(steel));
a.part('branch',cylinder(36*s,r,12).subtract(cylinder(38*s,8*s,12).translate(0,0,-s)).rotateX(90).translate(0,18*s,22*s).color(bronze));
return a.model();
