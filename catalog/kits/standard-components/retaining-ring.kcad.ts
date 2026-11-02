meta({
  name: 'retaining-ring',
  license: 'CC0-1.0',
  title: 'Retaining ring',
  description: 'Open retaining ring profile with two small installation ears. Knobs: model size and finish colour.',
  tags: ['retaining ring', 'circlip', 'shaft retainer', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('retaining-ring');
let ring=cylinder(3*s,20*s,16).subtract(cylinder(5*s,16*s,16).translate(0,0,-s));
ring=ring.subtract(block(-3*s,15*s,-s,6*s,10*s,5*s));
a.part('ring',ring.color(finish));
a.part('ear-left',block(-9*s,17*s,0,6*s,7*s,3*s).color(finish));
a.part('ear-right',block(3*s,17*s,0,6*s,7*s,3*s).color(finish));
return a.model();
