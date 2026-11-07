// Distinctive geometry: Angled 45 degree pipe connector with open ends and a thicker low-poly center bend
meta({
  name: 'pipe-elbow-45',
  license: 'CC0-1.0',
  title: '45 degree pipe elbow',
  description: 'Angled 45 degree pipe connector with open ends and a thicker low-poly center bend Knobs: model size, steel, bronze.',
  tags: ['pipe elbow', '45 degree elbow', 'plumbing fitting', 'tube'],
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
const a = assembly('pipe-elbow-45');
const r=12*s;
a.part('base',cylinder(20*s,r,12).subtract(cylinder(22*s,8*s,12).translate(0,0,-s)).color(steel));
a.part('angled',cylinder(29*s,r,12).subtract(cylinder(31*s,8*s,12).translate(0,0,-s)).rotateY(45).translate(0,0,12*s).color(steel));
a.part('bend',cylinder(12*s,r+2*s,12).translate(0,0,17*s).color(bronze));
return a.model();
