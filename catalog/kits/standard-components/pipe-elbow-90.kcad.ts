// Distinctive geometry: Low-poly 90 degree elbow fitting with two hollow perpendicular pipe ends
meta({
  name: 'pipe-elbow-90',
  license: 'CC0-1.0',
  title: '90 degree pipe elbow',
  description: 'Low-poly 90 degree elbow fitting with two hollow perpendicular pipe ends Knobs: model size, steel, bronze.',
  tags: ['pipe elbow', '90 degree elbow', 'plumbing fitting', 'tube'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 380,
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
const a = assembly('pipe-elbow-90');
const r=13*s, len=26*s, z0=0;
a.part('upright',cylinder(28*s,r,12).subtract(cylinder(30*s,9*s,12).translate(0,0,-s)).translate(-len/2,0,z0).color(steel));
a.part('branch',cylinder(len,r,12).subtract(cylinder(len+2*s,9*s,12).translate(0,0,-s)).rotateX(90).translate(0,len/2,28*s).color(steel));
a.part('bend',cylinder(15*s,r,12).translate(-len/2,0,20*s).color(bronze));
return a.model();
