meta({
  name: 'hose-barb-adapter',
  license: 'CC0-1.0',
  title: 'Hose barb adapter',
  description: 'Stepped hose-barb adapter with a hollow center and three grip ribs. Knobs: model size and finish colour.',
  tags: ['hose barb', 'hose adapter', 'barbed fitting', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 500,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('hose-barb-adapter');
a.part('stem',cylinder(28*s,10*s,8).subtract(cylinder(30*s,6*s,8).translate(0,0,-s)).color(finish));
for (const z of [6,13,20]) a.part(`barb-${z}`,cylinder(3*s,(z===20?13:12)*s,8).subtract(cylinder(5*s,6*s,8).translate(0,0,-s)).translate(0,0,z*s).color(finish));
a.part('hex-body',block(-14*s,-14*s,28*s,28*s,28*s,8*s).subtract(cylinder(10*s,6*s,8).translate(0,0,27*s)).color(finish));
return a.model();
